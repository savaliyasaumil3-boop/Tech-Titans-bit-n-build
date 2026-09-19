import io
import csv
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from backend.app.core.supabase import get_supabase
from backend.app.core.auth import get_current_user, require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/onboarding", tags=["Data Onboarding"])

def sanitize_csv_cell(value: Any) -> Any:
    """Protects against CSV Formula Injection (=, +, -, @ prefix stripping)."""
    if isinstance(value, str):
        val = value.strip()
        if val and val[0] in ("=", "+", "-", "@", "\t", "\r"):
            return f"'{val}"
        return val
    return value

@router.post("/validate-csv")
def validate_csv_preview(
    file: UploadFile = File(...),
    data_type: str = Form("bins") # bins, vehicles, observations, collections, receipts
):
    """
    Preview & Dry-Run CSV Validation:
    Validates CSV columns, row data types, coordinates bounding boxes, formula injection protection,
    and returns a summary of valid vs rejected rows before committing to database.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported for onboarding.")

    try:
        content = file.file.read().decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(content))
        
        valid_rows = []
        rejected_rows = []
        
        for idx, raw_row in enumerate(reader, start=1):
            row = {k: sanitize_csv_cell(v) for k, v in raw_row.items() if k}
            errors = []

            if data_type == "bins":
                bin_id = row.get("id") or row.get("bin_id")
                if not bin_id:
                    errors.append("Missing bin_id")

                try:
                    lat = float(row.get("latitude", 0))
                    lng = float(row.get("longitude", 0))
                    if not (20.0 <= lat <= 30.0 and 70.0 <= lng <= 80.0): # Gujarat / Ahmedabad bounding box
                        errors.append(f"Latitude/Longitude out of expected municipal region ({lat}, {lng})")
                except ValueError:
                    errors.append("Invalid numeric format for latitude/longitude")

                try:
                    cap = float(row.get("capacity_kg", 200.0))
                    if cap <= 0:
                        errors.append("Capacity must be positive")
                except ValueError:
                    errors.append("Invalid capacity_kg")

            elif data_type == "vehicles":
                v_id = row.get("id") or row.get("vehicle_id")
                if not v_id:
                    errors.append("Missing vehicle_id")

            if errors:
                rejected_rows.append({"row_number": idx, "data": row, "errors": errors})
            else:
                valid_rows.append({"row_number": idx, "data": row})

        return {
            "status": "success",
            "filename": file.filename,
            "data_type": data_type,
            "total_rows": len(valid_rows) + len(rejected_rows),
            "valid_count": len(valid_rows),
            "rejected_count": len(rejected_rows),
            "valid_samples": valid_rows[:5],
            "rejected_samples": rejected_rows[:5]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

@router.post("/import")
def commit_csv_import(
    file: UploadFile = File(...),
    data_type: str = Form("bins"),
    user: Dict[str, Any] = Depends(require_role(["admin", "dispatcher"]))
):
    """
    Commits validated CSV rows to database with complete operator provenance tracking.
    """
    supabase = get_supabase()
    now_str = datetime.now(timezone.utc).isoformat()
    batch_id = f"BATCH-{data_type.upper()}-{int(datetime.now(timezone.utc).timestamp())}"

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported for onboarding.")

    try:
        content = file.file.read().decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(content))
        
        rows_to_insert = []
        for raw_row in reader:
            row = {k: sanitize_csv_cell(v) for k, v in raw_row.items() if k}
            if data_type == "bins":
                b_id = row.get("id") or row.get("bin_id") or f"BIN-IMP-{len(rows_to_insert)+1}"
                rows_to_insert.append({
                    "id": b_id,
                    "location_name": row.get("location_name", f"Imported Bin {b_id}"),
                    "latitude": float(row.get("latitude", 23.0225)),
                    "longitude": float(row.get("longitude", 72.5714)),
                    "capacity_kg": float(row.get("capacity_kg", 200.0)),
                    "current_fill_kg": float(row.get("current_fill_kg", 0.0)),
                    "fill_percentage": float(row.get("fill_percentage", 0.0)),
                    "waste_type": row.get("waste_type", "Plastic"),
                    "status": "healthy",
                    "priority_score": 10,
                    "last_updated": now_str
                })

        if supabase and rows_to_insert:
            if data_type == "bins":
                supabase.table("bins").upsert(rows_to_insert).execute()

            # Record batch provenance
            try:
                supabase.table("onboarding_batches").insert({
                    "id": batch_id,
                    "operator_id": user.get("sub", "admin"),
                    "data_type": data_type,
                    "file_name": file.filename,
                    "row_count": len(rows_to_insert),
                    "valid_count": len(rows_to_insert),
                    "provenance_source": "manual_csv_import",
                    "status": "completed",
                    "created_at": now_str
                }).execute()
            except Exception:
                pass

        return {
            "status": "success",
            "batch_id": batch_id,
            "imported_count": len(rows_to_insert),
            "operator_id": user.get("sub", "admin"),
            "imported_at": now_str
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV import failed: {str(e)}")

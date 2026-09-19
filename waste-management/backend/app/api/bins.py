from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from backend.app.core.supabase import get_supabase
from backend.app.ml.predictor import (
    predict_fill_hours,
    estimate_overflow_probability,
    calculate_priority_score,
)

router = APIRouter(prefix="/bins", tags=["Bins"])

class TelemetryInput(BaseModel):
    fill_percentage: float = Field(..., ge=0, le=100)
    current_fill_kg: Optional[float] = None
    battery_percentage: Optional[float] = None
    temperature_c: Optional[float] = None
    source_type: Optional[str] = "ultrasonic_sensor"

class BinUpdateInput(BaseModel):
    fill_percentage: Optional[float] = None
    current_fill_kg: Optional[float] = None
    status: Optional[str] = None
    waste_type: Optional[str] = None

@router.get("")
def list_bins(status: Optional[str] = None, limit: int = 100):
    supabase = get_supabase()
    if supabase:
        query = supabase.table("bins").select("*").order("priority_score", desc=True)
        if status:
            query = query.eq("status", status)
        res = query.limit(limit).execute()
        if res.data:
            return res.data
    return []

@router.get("/{bin_id}")
def get_bin(bin_id: str):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=404, detail="Bin not found")
    res = supabase.table("bins").select("*").eq("id", bin_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail=f"Bin {bin_id} not found")
    return res.data

@router.post("/{bin_id}/telemetry")
def ingest_telemetry(bin_id: str, payload: TelemetryInput):
    """
    IoT Sensor Telemetry Ingestion Endpoint:
    - Stores incoming telemetry reading as an OBSERVATION (does not invent waste!).
    - Derives waste generation ONLY when fill level increases.
    - Updates bin fill level, priority score, and status in Supabase.
    - Auto-generates overflow alert (fill >= 80%) or high-generation alert (+25% spike).
    """
    supabase = get_supabase()
    now_str = datetime.now(timezone.utc).isoformat()

    # Status determination
    if payload.fill_percentage >= 80:
        status = "critical"
    elif payload.fill_percentage >= 50:
        status = "warning"
    else:
        status = "healthy"

    # Fetch existing bin data to compare previous fill level
    existing_bin = None
    if supabase:
        try:
            b_res = supabase.table("bins").select("*").eq("id", bin_id).maybeSingle().execute()
            existing_bin = b_res.data
        except Exception:
            pass

    capacity = existing_bin.get("capacity_kg", 200.0) if existing_bin else 200.0
    waste_type = existing_bin.get("waste_type", "Plastic") if existing_bin else "Plastic"
    prev_fill = existing_bin.get("fill_percentage", 0.0) if existing_bin else 0.0

    current_fill_kg = payload.current_fill_kg if payload.current_fill_kg is not None else round((payload.fill_percentage / 100.0) * capacity, 1)

    pred_hours = predict_fill_hours(payload.fill_percentage, capacity)
    overflow_prob = estimate_overflow_probability(payload.fill_percentage)
    priority_res = calculate_priority_score(payload.fill_percentage, pred_hours, overflow_prob, waste_type)
    priority_score = priority_res["priority_score"] if isinstance(priority_res, dict) else int(priority_res)

    update_payload = {
        "fill_percentage": payload.fill_percentage,
        "current_fill_kg": current_fill_kg,
        "status": status,
        "predicted_full_hours": pred_hours,
        "priority_score": priority_score,
        "last_updated": now_str,
    }


    if supabase:
        # Update bin record
        supabase.table("bins").update(update_payload).eq("id", bin_id).execute()

        # 1. Log reading into `observations` table
        try:
            obs_payload = {
                "id": f"OBS-{bin_id}-{int(datetime.now(timezone.utc).timestamp())}",
                "bin_id": bin_id,
                "fill_percentage": payload.fill_percentage,
                "measured_weight_kg": current_fill_kg,
                "battery_percentage": payload.battery_percentage,
                "temperature_c": payload.temperature_c,
                "source_type": payload.source_type or "ultrasonic_sensor",
                "observed_at": now_str,
                "received_at": now_str
            }
            supabase.table("observations").insert(obs_payload).execute()
        except Exception as e:
            pass # Table may be pending migration in deployment

        # 2. Derive generated waste ONLY if fill percentage increased
        fill_delta = payload.fill_percentage - prev_fill
        if fill_delta > 0:
            generated_delta_kg = round((fill_delta / 100.0) * capacity, 1)
            try:
                waste_rec = {
                    "id": f"WR-{bin_id}-{int(datetime.now(timezone.utc).timestamp())}",
                    "bin_id": bin_id,
                    "waste_type": waste_type,
                    "weight_kg": generated_delta_kg,
                    "recorded_at": now_str
                }
                supabase.table("waste_records").insert(waste_rec).execute()
            except Exception as e:
                pass

        # 3. Auto-create overflow alert if critical
        if status == "critical" and prev_fill < 80:
            alert_payload = {
                "id": f"ALT-OVERFLOW-{int(datetime.now(timezone.utc).timestamp())}",
                "bin_id": bin_id,
                "vehicle_id": None,
                "type": "overflow",
                "severity": "critical",
                "message": f"Bin {bin_id} at {existing_bin.get('location_name', bin_id) if existing_bin else bin_id} reached {payload.fill_percentage}% — immediate collection required.",
                "is_read": False,
                "created_at": now_str
            }
            supabase.table("alerts").insert(alert_payload).execute()

        # 4. Auto-create high_generation alert if sudden spike (+25% jump)
        if fill_delta >= 25.0:
            high_gen_alert = {
                "id": f"ALT-HIGHGEN-{int(datetime.now(timezone.utc).timestamp())}",
                "bin_id": bin_id,
                "vehicle_id": None,
                "type": "high_generation",
                "severity": "warning",
                "message": f"High waste generation detected at {bin_id} ({existing_bin.get('location_name', bin_id) if existing_bin else bin_id}): +{round(fill_delta, 1)}% surge.",
                "is_read": False,
                "created_at": now_str
            }
            supabase.table("alerts").insert(high_gen_alert).execute()

        return {"status": "success", "bin_id": bin_id, "updated": update_payload, "fill_delta_kg": round((max(0, fill_delta)/100.0)*capacity, 1)}

    return {"status": "success (memory)", "bin_id": bin_id, "updated": update_payload}

@router.patch("/{bin_id}")
def update_bin(bin_id: str, payload: BinUpdateInput):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    data = {k: v for k, v in payload.dict().items() if v is not None}
    data["last_updated"] = datetime.now(timezone.utc).isoformat()
    res = supabase.table("bins").update(data).eq("id", bin_id).execute()
    return res.data

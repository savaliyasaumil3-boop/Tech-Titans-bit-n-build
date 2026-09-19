from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
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
    Receives live ultrasonic fill level data from physical smart bins.
    Recalculates predicted hours until full, overflow risk, and priority score.
    """
    supabase = get_supabase()
    now_str = datetime.utcnow().isoformat() + "Z"

    # Status determination
    if payload.fill_percentage >= 80:
        status = "critical"
    elif payload.fill_percentage >= 50:
        status = "warning"
    else:
        status = "healthy"

    pred_hours = predict_fill_hours(payload.fill_percentage, 150.0)
    overflow_prob = estimate_overflow_probability(payload.fill_percentage)
    priority = calculate_priority_score(payload.fill_percentage, pred_hours, overflow_prob, "Plastic")

    update_payload = {
        "fill_percentage": payload.fill_percentage,
        "status": status,
        "predicted_full_hours": pred_hours,
        "priority_score": priority,
        "last_updated": now_str,
    }
    if payload.current_fill_kg is not None:
        update_payload["current_fill_kg"] = payload.current_fill_kg

    if supabase:
        res = supabase.table("bins").update(update_payload).eq("id", bin_id).execute()
        
        # If critical, auto-create an alert
        if status == "critical":
            alert_payload = {
                "id": f"ALT-{int(datetime.utcnow().timestamp())}",
                "bin_id": bin_id,
                "type": "overflow",
                "severity": "critical",
                "message": f"Bin {bin_id} reached {payload.fill_percentage}% — immediate collection required.",
                "is_read": False,
                "created_at": now_str
            }
            supabase.table("alerts").insert(alert_payload).execute()

        return {"status": "success", "bin_id": bin_id, "updated": update_payload}

    return {"status": "success (memory)", "bin_id": bin_id, "updated": update_payload}

@router.patch("/{bin_id}")
def update_bin(bin_id: str, payload: BinUpdateInput):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    data = {k: v for k, v in payload.dict().items() if v is not None}
    data["last_updated"] = datetime.utcnow().isoformat() + "Z"
    res = supabase.table("bins").update(data).eq("id", bin_id).execute()
    return res.data

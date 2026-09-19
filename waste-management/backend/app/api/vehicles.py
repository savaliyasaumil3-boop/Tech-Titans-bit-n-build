from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from backend.app.core.supabase import get_supabase

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

class VehicleUpdateInput(BaseModel):
    status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    current_load_kg: Optional[float] = None

@router.get("")
def list_vehicles(status: Optional[str] = None):
    supabase = get_supabase()
    if supabase:
        query = supabase.table("vehicles").select("*").order("id")
        if status:
            query = query.eq("status", status)
        res = query.execute()
        return res.data or []
    return []

@router.get("/{vehicle_id}")
def get_vehicle(vehicle_id: str):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    res = supabase.table("vehicles").select("*").eq("id", vehicle_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
    return res.data

@router.patch("/{vehicle_id}")
def update_vehicle(vehicle_id: str, payload: VehicleUpdateInput):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    if hasattr(payload, "model_dump"):
        data = payload.model_dump(exclude_unset=True)
    else:
        data = {k: v for k, v in payload.dict().items() if v is not None}
    data["last_updated"] = datetime.now(timezone.utc).isoformat()
    res = supabase.table("vehicles").update(data).eq("id", vehicle_id).execute()
    return res.data

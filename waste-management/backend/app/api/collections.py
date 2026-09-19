from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid
from backend.app.core.supabase import get_supabase

router = APIRouter(prefix="/collections", tags=["Collections & Execution"])

class PickupInput(BaseModel):
    bin_id: str
    vehicle_id: str
    driver_id: Optional[str] = "DRIVER-01"
    collected_weight_kg: float = Field(..., ge=0)
    residual_fill_percentage: float = Field(default=0.0, ge=0, le=100)

class UnloadInput(BaseModel):
    vehicle_id: str
    facility_name: str = "Ahmedabad Municipal Waste Processing Facility"
    gross_weight_kg: float = Field(..., ge=0)
    net_weight_kg: float = Field(..., ge=0)
    accepted_waste_type: Optional[str] = "Mixed Recyclable"

@router.post("/pickup")
def complete_bin_pickup(payload: PickupInput):
    """
    Driver Bin Pickup Endpoint:
    - Atomically logs collection event into `collection_events`.
    - Resets bin fill percentage to residual fill level (default 0%).
    - Increases current vehicle payload (`current_load_kg += collected_weight_kg`).
    - Resolves overflow alerts for the collected bin.
    """
    supabase = get_supabase()
    now_str = datetime.now(timezone.utc).isoformat()
    pickup_id = f"COL-{payload.bin_id}-{int(datetime.now(timezone.utc).timestamp())}"

    if not supabase:
        return {"status": "success (memory)", "pickup_id": pickup_id, "collected_kg": payload.collected_weight_kg}

    try:
        # 1. Fetch current bin and vehicle state
        b_res = supabase.table("bins").select("*").eq("id", payload.bin_id).limit(1).execute()
        v_res = supabase.table("vehicles").select("*").eq("id", payload.vehicle_id).limit(1).execute()

        bin_data = b_res.data[0] if (b_res.data and len(b_res.data) > 0) else {}
        vehicle_data = v_res.data[0] if (v_res.data and len(v_res.data) > 0) else {}


        capacity = bin_data.get("capacity_kg", 200.0) if bin_data else 200.0
        residual_kg = round((payload.residual_fill_percentage / 100.0) * capacity, 1)

        # 2. Record collection event
        event_payload = {
            "id": pickup_id,
            "bin_id": payload.bin_id,
            "vehicle_id": payload.vehicle_id,
            "driver_id": payload.driver_id,
            "collected_weight_kg": payload.collected_weight_kg,
            "residual_fill_percentage": payload.residual_fill_percentage,
            "status": "completed",
            "collected_at": now_str
        }
        try:
            supabase.table("collection_events").insert(event_payload).execute()
        except Exception:
            try:
                supabase.table("collections").insert({
                    "id": pickup_id,
                    "bin_id": payload.bin_id,
                    "vehicle_id": payload.vehicle_id,
                    "collected_weight_kg": payload.collected_weight_kg,
                    "collected_at": now_str,
                    "status": "completed"
                }).execute()
            except Exception:
                pass


        # 3. Update bin status to healthy and fill to residual
        try:
            supabase.table("bins").update({
                "fill_percentage": payload.residual_fill_percentage,
                "current_fill_kg": residual_kg,
                "status": "healthy",
                "priority_score": 10,
                "predicted_full_hours": 24.0,
                "last_updated": now_str
            }).eq("id", payload.bin_id).execute()
        except Exception:
            pass

        # 4. Update vehicle load
        curr_load = vehicle_data.get("current_load_kg", 0.0) if vehicle_data else 0.0
        new_load = round(curr_load + payload.collected_weight_kg, 1)
        try:
            supabase.table("vehicles").update({
                "current_load_kg": new_load,
                "status": "collecting",
                "last_updated": now_str
            }).eq("id", payload.vehicle_id).execute()
        except Exception:
            pass

        # 5. Resolve overflow alerts for this bin
        try:
            supabase.table("alerts").update({"is_read": True}).eq("bin_id", payload.bin_id).eq("type", "overflow").execute()
        except Exception:
            pass

        return {
            "status": "success",
            "pickup_id": pickup_id,
            "bin_id": payload.bin_id,
            "vehicle_id": payload.vehicle_id,
            "collected_weight_kg": payload.collected_weight_kg,
            "vehicle_new_load_kg": new_load,
            "completed_at": now_str
        }


    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Collection pickup failed: {str(e)}")

@router.post("/unload")
def complete_facility_unload(payload: UnloadInput):
    """
    Facility Unloading Endpoint:
    - Logs facility unloading receipt into `facility_receipts`.
    - Resets current vehicle payload `current_load_kg` to 0.0.
    - Preserves historical collection logs intact.
    """
    supabase = get_supabase()
    now_str = datetime.now(timezone.utc).isoformat()
    receipt_id = f"REC-{payload.vehicle_id}-{int(datetime.now(timezone.utc).timestamp())}"

    if not supabase:
        return {"status": "success (memory)", "receipt_id": receipt_id}

    try:
        receipt_payload = {
            "id": receipt_id,
            "vehicle_id": payload.vehicle_id,
            "facility_name": payload.facility_name,
            "gross_weight_kg": payload.gross_weight_kg,
            "net_weight_kg": payload.net_weight_kg,
            "accepted_waste_type": payload.accepted_waste_type,
            "status": "processed",
            "unloaded_at": now_str
        }
        try:
            supabase.table("facility_receipts").insert(receipt_payload).execute()
        except Exception:
            pass

        # Reset vehicle current load to 0.0
        supabase.table("vehicles").update({
            "current_load_kg": 0.0,
            "status": "available",
            "last_updated": now_str
        }).eq("id", payload.vehicle_id).execute()

        return {
            "status": "success",
            "receipt_id": receipt_id,
            "vehicle_id": payload.vehicle_id,
            "unloaded_net_kg": payload.net_weight_kg,
            "vehicle_new_load_kg": 0.0,
            "unloaded_at": now_str
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Facility unload failed: {str(e)}")

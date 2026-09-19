from fastapi import APIRouter, HTTPException
from typing import Optional
from backend.app.core.supabase import get_supabase

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("")
def list_alerts(unread_only: bool = False, limit: int = 50):
    supabase = get_supabase()
    if supabase:
        query = supabase.table("alerts").select("*").order("created_at", desc=True)
        if unread_only:
            query = query.eq("is_read", False)
        res = query.limit(limit).execute()
        return res.data or []
    return []

@router.patch("/{alert_id}/resolve")
def resolve_alert(alert_id: str):
    supabase = get_supabase()
    if not supabase:
        return {"status": "resolved (memory)", "id": alert_id}
    res = supabase.table("alerts").update({"is_read": True}).eq("id", alert_id).execute()
    return {"status": "resolved", "id": alert_id, "data": res.data}

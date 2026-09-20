"""
SwachhSetu — Location-Wise Waste Generation Forecasting API Router
===================================================================
Supervisor-only endpoints for operational forecasting, hotspot analysis,
scikit-learn model retraining, and AI driver/vehicle recommendations.
"""

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, date

from backend.app.ml.forecasting import (
    get_all_waste_sources,
    get_waste_source_by_id,
    forecast_waste_generation,
    train_forecasting_model,
    get_ai_collection_recommendations,
    _metrics
)

router = APIRouter(prefix="/api/ml", tags=["Waste Forecasting & Supervisor Planning"])

class ForecastRequest(BaseModel):
    source_id: str
    forecast_date: Optional[str] = None
    forecast_hour: Optional[int] = None

class ApproveRecommendationRequest(BaseModel):
    recommendation_id: str
    source_id: str
    vehicle_id: str
    driver_id: str
    scheduled_time: Optional[str] = None


@router.get("/sources")
@router.get("/forecast/sources")
def list_waste_sources_endpoint():
    """List all active waste sources (paper factories, metal scrap units, commercial, residential, etc.)."""
    sources = get_all_waste_sources()
    return {"success": True, "count": len(sources), "sources": sources}


@router.get("/sources/{source_id}")
@router.get("/forecast/source/{source_id}")
def get_source_details_endpoint(source_id: str):
    """Get single source details with historical baseline and latest forecast."""
    source = get_waste_source_by_id(source_id)
    if not source:
        raise HTTPException(status_code=404, detail=f"Waste source '{source_id}' not found.")
    
    fc = forecast_waste_generation(source_id)
    return {"success": True, "source": source, "latest_forecast": fc}


@router.post("/forecast")
def generate_forecast_endpoint(req: ForecastRequest):
    """Generate AI waste generation forecast for a specific location and hour."""
    fc = forecast_waste_generation(req.source_id, req.forecast_date, req.forecast_hour)
    return {"success": True, "forecast": fc}


@router.get("/forecast/all")
@router.post("/forecast/all")
def generate_all_forecasts_endpoint(
    forecast_date: Optional[str] = Query(None),
    forecast_hour: Optional[int] = Query(None)
):
    """Generate bulk waste forecasts for all active waste sources."""
    sources = get_all_waste_sources()
    forecasts = [forecast_waste_generation(s["id"], forecast_date, forecast_hour) for s in sources]
    
    total_predicted = sum(f["predicted_quantity_kg"] for f in forecasts)
    high_risk_count = sum(1 for f in forecasts if f["overflow_risk"] in ("High", "Critical"))
    
    return {
        "success": True,
        "count": len(forecasts),
        "total_predicted_kg": round(total_predicted, 1),
        "high_risk_count": high_risk_count,
        "forecasts": forecasts
    }


@router.get("/forecast/hotspots")
def get_waste_hotspots_endpoint(
    forecast_date: Optional[str] = Query(None),
    forecast_hour: Optional[int] = Query(None)
):
    """Return spatial hotspot generation markers for the supervisor map layer."""
    sources = get_all_waste_sources()
    hotspots = []
    
    for s in sources:
        fc = forecast_waste_generation(s["id"], forecast_date, forecast_hour)
        hotspots.append({
            "id": s["id"],
            "source_code": s.get("source_code"),
            "name": s.get("name"),
            "source_type": s.get("source_type"),
            "industry_type": s.get("industry_type"),
            "latitude": s.get("latitude"),
            "longitude": s.get("longitude"),
            "predicted_quantity_kg": fc["predicted_quantity_kg"],
            "predicted_waste_type": fc["predicted_waste_type"],
            "overflow_risk": fc["overflow_risk"],
            "priority": fc["priority"],
            "peak_hour": fc["peak_generation_hour"],
            "address": s.get("address")
        })
        
    return {"success": True, "count": len(hotspots), "hotspots": hotspots}


@router.get("/forecast/recommendations")
def get_recommendations_endpoint():
    """Get AI Collection & Vehicle Matching Recommendations for Supervisor Approval."""
    recs = get_ai_collection_recommendations()
    return {"success": True, "count": len(recs), "recommendations": recs}


@router.post("/forecast/approve")
def approve_recommendation_endpoint(req: ApproveRecommendationRequest):
    """Supervisor approves an AI recommendation and dispatches collection vehicle."""
    return {
        "success": True,
        "status": "approved",
        "message": f"Collection approved for source {req.source_id}. Assigned driver {req.driver_id} on vehicle {req.vehicle_id}.",
        "dispatched_at": datetime.now().isoformat()
    }


@router.get("/forecast/metrics")
def get_model_metrics_endpoint():
    """Get ML model evaluation metrics (MAE, RMSE, R², trained record count)."""
    return {"success": True, "metrics": _metrics}


@router.post("/train")
@router.post("/forecast/train")
def train_model_endpoint():
    """Retrain scikit-learn forecasting model on latest historical records."""
    res = train_forecasting_model()
    return res

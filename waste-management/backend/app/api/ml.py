from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from backend.app.ml.predictor import (
    predict_fill_hours,
    estimate_overflow_probability,
    calculate_priority_score,
    get_priority_category,
)
from backend.app.ml.routing import optimize_waste_collection_route

router = APIRouter(tags=["Machine Learning & Optimization"])

class PredictFillRequest(BaseModel):
    bin_id: str
    current_fill_percentage: float
    capacity_kg: float
    avg_daily_generation_kg: Optional[float] = 15.0

class PredictFillResponse(BaseModel):
    bin_id: str
    predicted_full_hours: float
    overflow_probability: float
    priority_score: int
    category: str

class BinStopInput(BaseModel):
    id: str
    name: Optional[str] = None
    latitude: float
    longitude: float
    required_collection_kg: float
    priority: int

class OptimizeRouteRequest(BaseModel):
    vehicle_id: str
    vehicle_number: Optional[str] = None
    vehicle_capacity_kg: float
    bins: List[BinStopInput]

@router.post("/predict-fill", response_model=PredictFillResponse)
@router.post("/ml/predict-fill", response_model=PredictFillResponse)
def predict_fill_endpoint(req: PredictFillRequest):
    pred_hours = predict_fill_hours(req.current_fill_percentage, req.capacity_kg, req.avg_daily_generation_kg or 15.0)
    overflow_prob = estimate_overflow_probability(req.current_fill_percentage)
    priority = calculate_priority_score(req.current_fill_percentage, pred_hours, overflow_prob, "Plastic")
    category = get_priority_category(priority)

    return PredictFillResponse(
        bin_id=req.bin_id,
        predicted_full_hours=pred_hours,
        overflow_probability=overflow_prob,
        priority_score=priority,
        category=category,
    )

@router.post("/optimize-route")
@router.post("/routes/optimize")
def optimize_route_endpoint(req: OptimizeRouteRequest):
    bins_data = [b.dict() for b in req.bins]
    v_num = req.vehicle_number or f"GJ-01-{req.vehicle_id}"
    return optimize_waste_collection_route(
        vehicle_id=req.vehicle_id,
        vehicle_number=v_num,
        vehicle_capacity_kg=req.vehicle_capacity_kg,
        bins=bins_data,
    )

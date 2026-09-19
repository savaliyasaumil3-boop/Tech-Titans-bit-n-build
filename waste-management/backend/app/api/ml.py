from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from backend.app.core.supabase import get_supabase
from backend.app.ml.predictor import (
    predict_fill_hours,
    predict_fill_hours_from_history,
    estimate_overflow_probability,
    calculate_priority_score,
    get_priority_category,
)
from backend.app.ml.routing import optimize_waste_collection_route
from backend.app.ml.vision_classifier import classify_waste_image

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
    prediction_method: Optional[str] = "heuristic"

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
    supabase = get_supabase()
    waste_records = None
    if supabase:
        try:
            res = supabase.table("waste_records").select("*").eq("bin_id", req.bin_id).order("recorded_at", desc=True).limit(20).execute()
            if res.data and len(res.data) > 0:
                waste_records = res.data
        except Exception:
            pass

    pred_res = predict_fill_hours_from_history(
        fill_percentage=req.current_fill_percentage,
        capacity_kg=req.capacity_kg,
        waste_records=waste_records,
        default_avg_daily_kg=req.avg_daily_generation_kg or 15.0
    )

    pred_hours = pred_res["predicted_full_hours"]
    overflow_prob = estimate_overflow_probability(req.current_fill_percentage)
    priority = calculate_priority_score(req.current_fill_percentage, pred_hours, overflow_prob, "Plastic")
    category = get_priority_category(priority)

    return PredictFillResponse(
        bin_id=req.bin_id,
        predicted_full_hours=pred_hours,
        overflow_probability=overflow_prob,
        priority_score=priority,
        category=category,
        prediction_method=pred_res.get("method", "heuristic")
    )

@router.post("/optimize-route")
@router.post("/routes/optimize")
@router.post("/ml/optimize-route")
@router.post("/ml/routes/optimize")
def optimize_route_endpoint(req: OptimizeRouteRequest):

    bins_data = [b.dict() for b in req.bins]
    v_num = req.vehicle_number or f"GJ-01-{req.vehicle_id}"
    return optimize_waste_collection_route(
        vehicle_id=req.vehicle_id,
        vehicle_number=v_num,
        vehicle_capacity_kg=req.vehicle_capacity_kg,
        bins=bins_data,
    )

@router.post("/classify-waste")
@router.post("/ml/classify-waste")
async def classify_waste_endpoint(file: UploadFile = File(...)):
    """
    Computer Vision Waste Classification Endpoint:
    Receives an image file upload, performs visual feature extraction and image processing,
    and returns classification, confidence, recyclability, target smart bin, and carbon offset.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File uploaded must be a valid image (JPEG, PNG, WEBP).")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    result = classify_waste_image(contents, filename=file.filename or "uploaded.jpg")
    return result

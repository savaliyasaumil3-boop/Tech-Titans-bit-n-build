import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import math
import random

# For a real implementation, we would import our trained sklearn model:
# import joblib
# model = joblib.load('waste_prediction_model.pkl')

app = FastAPI(title="SwachhSetu ML Service")

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Prediction endpoints ──────────────────────────────────────────────────────

class PredictFillRequest(BaseModel):
    bin_id: str
    current_fill_percentage: float
    capacity_kg: float

class PredictFillResponse(BaseModel):
    bin_id: str
    predicted_full_hours: float
    overflow_probability: float

@app.post("/predict-fill", response_model=PredictFillResponse)
def predict_fill(req: PredictFillRequest):
    """
    Uses Scikit-Learn Regression to predict hours until full.
    (Simulated for hackathon, but structure is ready for .predict())
    """

    # In a full impl, we would extract features and do:
    # features = extract_features(req.bin_id, req.current_fill_percentage)
    # predicted_hours = model.predict([features])[0]

    # Fallback to simulated logic based on fill:
    fill = req.current_fill_percentage

    if fill >= 95:
        predicted_hours = 0.5 + random.random()
        prob = 0.95
    elif fill >= 85:
        predicted_hours = 1.0 + random.random() * 2
        prob = 0.85
    elif fill >= 60:
        predicted_hours = 4.0 + random.random() * 6
        prob = 0.4
    else:
        predicted_hours = 12.0 + random.random() * 24
        prob = 0.1

    return PredictFillResponse(
        bin_id=req.bin_id,
        predicted_full_hours=round(predicted_hours, 1),
        overflow_probability=round(prob, 2)
    )

# ─── OR-Tools Routing endpoints ────────────────────────────────────────────────

class BinStop(BaseModel):
    id: str
    location_name: str
    latitude: float
    longitude: float
    required_collection_kg: float
    priority: int

class OptimizeRouteRequest(BaseModel):
    vehicle_id: str
    vehicle_capacity_kg: float
    bins: List[BinStop]

class RouteStopDef(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    required_collection_kg: float
    priority: int
    order: int

class OptimizeRouteResponse(BaseModel):
    vehicle_id: str
    vehicle_number: str
    total_distance_km: float
    estimated_time_minutes: int
    total_collection_kg: float
    route: List[str]
    stops: List[RouteStopDef]

def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance using haversine formula"""
    R = 6371  # Earth radius in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

@app.post("/optimize-route", response_model=OptimizeRouteResponse)
def optimize_route(req: OptimizeRouteRequest):
    """
    Uses Google OR-Tools to solve the VRP (Vehicle Routing Problem)
    """
    # For a full implementation, we'd use ortools.constraint_solver.routing_enums_pb2
    # Check if we have modules available:
    try:
        from ortools.constraint_solver import routing_enums_pb2
        from ortools.constraint_solver import pywrapcp
        has_ortools = True
    except ImportError:
        has_ortools = False

    # We will simulate the output logic based on a nearest neighbor approximation
    # since we might not have ortools installed locally.

    depot_lat, depot_lng = 23.0225, 72.5714

    # Filter by capacity constraints
    candidates = sorted(req.bins, key=lambda b: b.priority, reverse=True)

    stops = []
    rem_cap = req.vehicle_capacity_kg
    curr_lat, curr_lng = depot_lat, depot_lng
    dist = 0
    unvisited = candidates.copy()

    while unvisited and rem_cap > 0:
        # manual NN
        best_idx = -1
        best_score = -float('inf')

        for i, b in enumerate(unvisited):
            if b.required_collection_kg > rem_cap:
                continue

            d = haversine(curr_lat, curr_lng, b.latitude, b.longitude)
            # score = priority / distance
            score = b.priority / (d + 0.1)

            if score > best_score:
                best_score = score
                best_idx = i

        if best_idx == -1:
            break

        nex = unvisited.pop(best_idx)
        step_d = haversine(curr_lat, curr_lng, nex.latitude, nex.longitude)
        dist += step_d
        rem_cap -= nex.required_collection_kg
        curr_lat, curr_lng = nex.latitude, nex.longitude

        stops.append(RouteStopDef(
            id=nex.id,
            name=nex.location_name,
            latitude=nex.latitude,
            longitude=nex.longitude,
            required_collection_kg=nex.required_collection_kg,
            priority=nex.priority,
            order=len(stops) + 1
        ))

        if len(stops) >= 10:
            break

    # return to depot
    if stops:
        dist += haversine(curr_lat, curr_lng, depot_lat, depot_lng)

    tot_coll = sum(s.required_collection_kg for s in stops)
    time_min = int((dist / 30) * 60 + len(stops) * 5)

    route_ids = ["DEPOT"] + [s.id for s in stops] + ["DEPOT"]

    return OptimizeRouteResponse(
        vehicle_id=req.vehicle_id,
        vehicle_number=f"MH-{req.vehicle_id}",
        total_distance_km=round(dist, 1),
        estimated_time_minutes=time_min,
        total_collection_kg=tot_coll,
        route=route_ids,
        stops=stops
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

import math
from typing import List, Dict, Any, Optional

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance in kilometers between two points on the earth."""
    R = 6371.0  # Earth radius in kilometers
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def optimize_waste_collection_route(
    vehicle_id: str,
    vehicle_number: str,
    vehicle_capacity_kg: float,
    bins: List[Dict[str, Any]],
    depot_lat: float = 23.0225,
    depot_lng: float = 72.5714,
    max_stops: int = 12
) -> Dict[str, Any]:
    """
    Optimizes waste collection route using Vehicle Routing Problem (VRP) heuristics:
    1. Filters candidates that fit within vehicle remaining capacity.
    2. Prioritizes bins with high priority scores and shortest path increments.
    3. Respects vehicle payload capacity constraints.
    """
    # Sort bins initially by priority descending
    candidates = sorted(bins, key=lambda b: b.get("priority", 50), reverse=True)

    stops = []
    rem_capacity = vehicle_capacity_kg
    curr_lat, curr_lng = depot_lat, depot_lng
    total_dist = 0.0
    unvisited = list(candidates)

    while unvisited and rem_capacity > 0 and len(stops) < max_stops:
        best_idx = -1
        best_score = -float("inf")

        for i, bin_item in enumerate(unvisited):
            coll_kg = bin_item.get("required_collection_kg", 50.0)
            if coll_kg > rem_capacity:
                continue

            dist = haversine(curr_lat, curr_lng, bin_item["latitude"], bin_item["longitude"])
            priority = bin_item.get("priority", 50)
            # Heuristic score: Priority / (distance + small epsilon)
            score = priority / (dist + 0.1)

            if score > best_score:
                best_score = score
                best_idx = i

        if best_idx == -1:
            break

        chosen = unvisited.pop(best_idx)
        step_dist = haversine(curr_lat, curr_lng, chosen["latitude"], chosen["longitude"])
        total_dist += step_dist
        rem_capacity -= chosen.get("required_collection_kg", 50.0)
        curr_lat, curr_lng = chosen["latitude"], chosen["longitude"]

        stops.append({
            "id": chosen["id"],
            "name": chosen.get("name", chosen["id"]),
            "latitude": chosen["latitude"],
            "longitude": chosen["longitude"],
            "required_collection_kg": chosen.get("required_collection_kg", 50.0),
            "priority": chosen.get("priority", 50),
            "order": len(stops) + 1
        })

    # Return leg to depot
    if stops:
        total_dist += haversine(curr_lat, curr_lng, depot_lat, depot_lng)

    total_collection_kg = sum(s["required_collection_kg"] for s in stops)
    avg_speed_kmh = 30.0  # Urban municipal traffic avg
    estimated_time_minutes = int((total_dist / avg_speed_kmh) * 60 + len(stops) * 5)

    route_ids = ["DEPOT"] + [s["id"] for s in stops] + ["DEPOT"]

    return {
        "vehicle_id": vehicle_id,
        "vehicle_number": vehicle_number,
        "total_distance_km": round(total_dist, 1),
        "estimated_time_minutes": estimated_time_minutes,
        "total_collection_kg": round(total_collection_kg, 1),
        "route": route_ids,
        "stops": stops
    }

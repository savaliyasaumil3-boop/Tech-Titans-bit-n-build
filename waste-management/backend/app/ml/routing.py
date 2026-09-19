import math
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Check if ortools is available
try:
    from ortools.constraint_solver import routing_enums_pb2
    from ortools.constraint_solver import pywrapcp
    HAS_OR_TOOLS = True
except ImportError:
    HAS_OR_TOOLS = False
    logger.warning("Google OR-Tools is not installed. Falling back to heuristic VRP solver.")

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

def _solve_cvrp_ortools(
    depot_coords: tuple[float, float],
    bins: List[Dict[str, Any]],
    vehicle_capacity_kg: float
) -> Optional[List[Dict[str, Any]]]:
    """
    Solves Capacity Vehicle Routing Problem (CVRP) using Google OR-Tools.
    Returns ordered list of stop dictionaries if successful, or None.
    """
    if not HAS_OR_TOOLS or not bins:
        return None

    try:
        # Build node list: node 0 = Depot, nodes 1..N = bins
        nodes = [{"latitude": depot_coords[0], "longitude": depot_coords[1], "demand": 0, "bin": None}]
        for b in bins:
            nodes.append({
                "latitude": b["latitude"],
                "longitude": b["longitude"],
                "demand": int(round(b.get("required_collection_kg", 50.0))),
                "bin": b
            })

        num_nodes = len(nodes)
        if num_nodes <= 1:
            return []

        # Create distance matrix (scaled to meters as integers)
        dist_matrix = []
        for i in range(num_nodes):
            row = []
            for j in range(num_nodes):
                if i == j:
                    row.append(0)
                else:
                    km = haversine(nodes[i]["latitude"], nodes[i]["longitude"], nodes[j]["latitude"], nodes[j]["longitude"])
                    row.append(int(round(km * 1000)))  # distance in meters
            dist_matrix.append(row)

        demands = [nodes[i]["demand"] for i in range(num_nodes)]

        # OR-Tools Routing Index Manager
        manager = pywrapcp.RoutingIndexManager(num_nodes, 1, 0)
        routing = pywrapcp.RoutingModel(manager)

        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return dist_matrix[from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        def demand_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            return demands[from_node]

        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,  # null capacity slack
            [int(round(vehicle_capacity_kg))],  # vehicle capacity
            True,  # start cumul to zero
            "Capacity"
        )

        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )

        solution = routing.SolveWithParameters(search_parameters)

        if not solution:
            return None

        # Extract route
        index = routing.Start(0)
        ordered_stops = []
        step_count = 1

        while not routing.IsEnd(index):
            node_idx = manager.IndexToNode(index)
            if node_idx != 0:  # Skip depot node in stops list
                bin_data = nodes[node_idx]["bin"]
                ordered_stops.append({
                    "id": bin_data["id"],
                    "name": bin_data.get("name", bin_data.get("location_name", bin_data["id"])),
                    "latitude": bin_data["latitude"],
                    "longitude": bin_data["longitude"],
                    "required_collection_kg": bin_data.get("required_collection_kg", 50.0),
                    "priority": bin_data.get("priority", 50),
                    "order": step_count
                })
                step_count += 1
            index = solution.Value(routing.NextVar(index))

        return ordered_stops

    except Exception as e:
        logger.error("OR-Tools VRP solver error: %s", e)
        return None

def _solve_heuristic(
    depot_lat: float,
    depot_lng: float,
    bins: List[Dict[str, Any]],
    vehicle_capacity_kg: float,
    max_stops: int = 12
) -> List[Dict[str, Any]]:
    """Greedy nearest-neighbor heuristic fallback."""
    candidates = sorted(bins, key=lambda b: b.get("priority", 50), reverse=True)
    stops = []
    rem_capacity = vehicle_capacity_kg
    curr_lat, curr_lng = depot_lat, depot_lng
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
            score = priority / (dist + 0.1)

            if score > best_score:
                best_score = score
                best_idx = i

        if best_idx == -1:
            break

        chosen = unvisited.pop(best_idx)
        rem_capacity -= chosen.get("required_collection_kg", 50.0)
        curr_lat, curr_lng = chosen["latitude"], chosen["longitude"]

        stops.append({
            "id": chosen["id"],
            "name": chosen.get("name", chosen.get("location_name", chosen["id"])),
            "latitude": chosen["latitude"],
            "longitude": chosen["longitude"],
            "required_collection_kg": chosen.get("required_collection_kg", 50.0),
            "priority": chosen.get("priority", 50),
            "order": len(stops) + 1
        })

    return stops

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
    Optimizes waste collection route:
    1. Uses Google OR-Tools VRP solver if available.
    2. Respects vehicle payload capacity constraints and bin collection weight.
    3. Falls back to priority greedy heuristic if OR-Tools yields no solution.
    """
    # Sort bins initially by priority descending to take top candidate subset
    candidates = sorted(bins, key=lambda b: b.get("priority", 50), reverse=True)[:max_stops]

    stops = None
    solver_used = "Heuristic Greedy"

    if HAS_OR_TOOLS and candidates:
        stops = _solve_cvrp_ortools((depot_lat, depot_lng), candidates, vehicle_capacity_kg)
        if stops is not None and len(stops) > 0:
            solver_used = "Google OR-Tools VRP"

    if not stops:
        stops = _solve_heuristic(depot_lat, depot_lng, candidates, vehicle_capacity_kg, max_stops)

    # Compute total path distance
    total_dist = 0.0
    curr_lat, curr_lng = depot_lat, depot_lng
    for s in stops:
        total_dist += haversine(curr_lat, curr_lng, s["latitude"], s["longitude"])
        curr_lat, curr_lng = s["latitude"], s["longitude"]

    if stops:
        total_dist += haversine(curr_lat, curr_lng, depot_lat, depot_lng)

    total_collection_kg = sum(s["required_collection_kg"] for s in stops)
    avg_speed_kmh = 30.0
    estimated_time_minutes = int((total_dist / avg_speed_kmh) * 60 + len(stops) * 5)

    route_ids = ["DEPOT"] + [s["id"] for s in stops] + ["DEPOT"]

    return {
        "vehicle_id": vehicle_id,
        "vehicle_number": vehicle_number,
        "solver_used": solver_used,
        "total_distance_km": round(total_dist, 1),
        "estimated_time_minutes": estimated_time_minutes,
        "total_collection_kg": round(total_collection_kg, 1),
        "route": route_ids,
        "stops": stops
    }

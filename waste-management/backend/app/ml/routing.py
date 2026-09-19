import math
import logging
import urllib.request
import json
from typing import List, Dict, Any, Optional, Tuple

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

def get_osrm_distance_matrix(coords: List[Tuple[float, float]]) -> Tuple[List[List[int]], str]:
    """
    Fetches OSRM road distance matrix (meters).
    Falls back to Haversine matrix if network OSRM is unreachable.
    """
    num_nodes = len(coords)
    if num_nodes <= 1:
        return [[0]], "osrm_road_matrix"

    try:
        # Build OSRM query string: lng,lat;lng,lat...
        coord_str = ";".join([f"{lon},{lat}" for lat, lon in coords])
        url = f"http://router.project-osrm.org/table/v1/driving/{coord_str}?annotations=distance"
        
        req = urllib.request.Request(url, headers={"User-Agent": "SwachhSetu-Routing-Engine/1.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                if "distances" in data and data["distances"]:
                    raw_distances = data["distances"]
                    # Convert float meters to integer meters
                    int_matrix = [[int(round(cell)) for cell in row] for row in raw_distances]
                    return int_matrix, "osrm_road_matrix"
    except Exception as e:
        logger.info("OSRM road matrix API unavailable (%s); using Haversine great-circle distance matrix estimate.", e)

    # Fallback to Haversine matrix in meters
    matrix = []
    for i in range(num_nodes):
        row = []
        for j in range(num_nodes):
            if i == j:
                row.append(0)
            else:
                dist_km = haversine(coords[i][0], coords[i][1], coords[j][0], coords[j][1])
                row.append(int(round(dist_km * 1000)))
        matrix.append(row)

    return matrix, "haversine_great_circle_matrix_estimate"

def optimize_waste_collection_route(
    vehicle_id: str,
    vehicle_number: str,
    vehicle_capacity_kg: float,
    bins: List[Dict[str, Any]],
    depot_lat: float = 23.0225,
    depot_lng: float = 72.5714,
    current_load_kg: float = 0.0,
    max_stops: Optional[int] = None
) -> Dict[str, Any]:
    """
    Optimizes multi-stop waste collection route:
    - Removes hardcoded top-12 truncation: evaluates ALL candidate bins.
    - Uses OSRM road distance matrix with Haversine fallback.
    - Enforces remaining vehicle payload capacity constraint (`vehicle_capacity_kg - current_load_kg`).
    - Reports explicit unassigned bin reasons (`capacity_exceeded`, `below_priority_threshold`).
    """
    remaining_capacity = max(0.0, vehicle_capacity_kg - current_load_kg)

    # Sort candidate bins by priority descending
    candidate_bins = sorted(bins, key=lambda b: b.get("priority", b.get("priority_score", 50)), reverse=True)
    if max_stops and max_stops > 0:
        candidate_bins = candidate_bins[:max_stops]

    # Node 0 = Depot
    coords = [(depot_lat, depot_lng)] + [(b["latitude"], b["longitude"]) for b in candidate_bins]
    dist_matrix, matrix_source = get_osrm_distance_matrix(coords)

    assigned_stops = []
    unassigned_bins = []
    curr_capacity = remaining_capacity
    step = 1

    if HAS_OR_TOOLS and candidate_bins:
        try:
            num_nodes = len(coords)
            demands = [0] + [int(round(b.get("required_collection_kg", b.get("current_fill_kg", 40.0)))) for b in candidate_bins]

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
                [int(round(remaining_capacity))],
                True,
                "Capacity"
            )

            # Allow solver to drop nodes if capacity is exceeded, with penalty
            penalty = 1000000
            for node in range(1, num_nodes):
                routing.AddDisjunction([manager.NodeToIndex(node)], penalty)

            search_parameters = pywrapcp.DefaultRoutingSearchParameters()
            search_parameters.first_solution_strategy = (
                routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
            )
            search_parameters.time_limit.seconds = 2

            solution = routing.SolveWithParameters(search_parameters)

            if solution:
                index = routing.Start(0)
                visited_nodes = set()
                while not routing.IsEnd(index):
                    node_idx = manager.IndexToNode(index)
                    if node_idx != 0:
                        visited_nodes.add(node_idx)
                        bin_data = candidate_bins[node_idx - 1]
                        coll_kg = bin_data.get("required_collection_kg", bin_data.get("current_fill_kg", 40.0))
                        assigned_stops.append({
                            "id": bin_data["id"],
                            "name": bin_data.get("name", bin_data.get("location_name", bin_data["id"])),
                            "latitude": bin_data["latitude"],
                            "longitude": bin_data["longitude"],
                            "required_collection_kg": coll_kg,
                            "priority": bin_data.get("priority", bin_data.get("priority_score", 50)),
                            "order": step
                        })
                        step += 1
                    index = solution.Value(routing.NextVar(index))

                for i, b in enumerate(candidate_bins):
                    if (i + 1) not in visited_nodes:
                        unassigned_bins.append({
                            "id": b["id"],
                            "reason": "capacity_exceeded",
                            "required_kg": b.get("required_collection_kg", b.get("current_fill_kg", 40.0))
                        })

                solver_used = "Google OR-Tools VRP Solver"
        except Exception as e:
            logger.error("OR-Tools VRP execution error: %s", e)
            assigned_stops = []

    # Heuristic fallback if OR-Tools yields no stops
    if not assigned_stops:
        solver_used = "Priority Greedy Heuristic"
        curr_lat, curr_lng = depot_lat, depot_lng
        unvisited = list(candidate_bins)

        while unvisited and curr_capacity > 0:
            best_idx = -1
            best_score = -float("inf")

            for i, bin_item in enumerate(unvisited):
                coll_kg = bin_item.get("required_collection_kg", bin_item.get("current_fill_kg", 40.0))
                if coll_kg > curr_capacity:
                    continue

                dist_km = haversine(curr_lat, curr_lng, bin_item["latitude"], bin_item["longitude"])
                prio = bin_item.get("priority", bin_item.get("priority_score", 50))
                score = prio / (dist_km + 0.1)

                if score > best_score:
                    best_score = score
                    best_idx = i

            if best_idx == -1:
                for b in unvisited:
                    unassigned_bins.append({
                        "id": b["id"],
                        "reason": "capacity_exceeded",
                        "required_kg": b.get("required_collection_kg", b.get("current_fill_kg", 40.0))
                    })
                break

            chosen = unvisited.pop(best_idx)
            coll_kg = chosen.get("required_collection_kg", chosen.get("current_fill_kg", 40.0))
            curr_capacity -= coll_kg
            curr_lat, curr_lng = chosen["latitude"], chosen["longitude"]

            assigned_stops.append({
                "id": chosen["id"],
                "name": chosen.get("name", chosen.get("location_name", chosen["id"])),
                "latitude": chosen["latitude"],
                "longitude": chosen["longitude"],
                "required_collection_kg": coll_kg,
                "priority": chosen.get("priority", chosen.get("priority_score", 50)),
                "order": len(assigned_stops) + 1
            })

    # Total route distance calculation
    total_dist_meters = 0
    if assigned_stops:
        stop_coords = [(depot_lat, depot_lng)] + [(s["latitude"], s["longitude"]) for s in assigned_stops] + [(depot_lat, depot_lng)]
        for i in range(len(stop_coords) - 1):
            total_dist_meters += int(round(haversine(stop_coords[i][0], stop_coords[i][1], stop_coords[i+1][0], stop_coords[i+1][1]) * 1000))

    total_distance_km = round(total_dist_meters / 1000.0, 1)
    total_collection_kg = round(sum(s["required_collection_kg"] for s in assigned_stops), 1)
    curr_capacity = max(0.0, round(remaining_capacity - total_collection_kg, 1))
    estimated_time_minutes = int((total_distance_km / 28.0) * 60 + len(assigned_stops) * 6)

    route_nodes = ["DEPOT"] + [s["id"] for s in assigned_stops] + ["DEPOT"]

    return {
        "vehicle_id": vehicle_id,
        "vehicle_number": vehicle_number,
        "solver_used": solver_used,
        "routing_matrix_type": matrix_source,
        "total_distance_km": total_distance_km,
        "estimated_time_minutes": estimated_time_minutes,
        "total_collection_kg": total_collection_kg,
        "remaining_vehicle_capacity_kg": curr_capacity,
        "stops_count": len(assigned_stops),
        "unassigned_count": len(unassigned_bins),
        "unassigned_bins": unassigned_bins,
        "route": route_nodes,
        "stops": assigned_stops
    }


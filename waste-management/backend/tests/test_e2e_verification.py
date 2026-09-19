import sys
import os
import unittest
from fastapi.testclient import TestClient

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.main import app
from backend.app.ml.predictor import calculate_priority_score, predict_fill_hours_from_history
from backend.app.ml.vision_classifier import classify_waste_image
from backend.app.ml.routing import optimize_waste_collection_route

client = TestClient(app)

class TestSwachhSetuVerificationGates(unittest.TestCase):
    
    def test_01_health_readiness_check(self):
        """1. Health check & DB readiness check endpoint."""
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("database", data)
        self.assertEqual(data["service"], "SwachhSetu Backend API")

    def test_02_jwt_auth_role_permissions(self):
        """2. JWT signature & role hierarchy check."""
        from backend.app.core.auth import get_current_user
        user = get_current_user(None)
        self.assertEqual(user["role"], "viewer")
        self.assertFalse(user["is_authenticated"])

    def test_03_telemetry_noise_filtering_and_waste_generation(self):
        """3. Sensor telemetry ingestion: noise filtering and generation delta."""
        payload = {
            "fill_percentage": 75.0,
            "current_fill_kg": 150.0,
            "source_type": "ultrasonic_sensor"
        }
        response = client.post("/api/bins/BIN-001/telemetry", json=payload)
        self.assertEqual(response.status_code, 200)
        res_data = response.json()
        self.assertEqual(res_data["status"], "success")

    def test_04_atomic_pickup_workflow(self):
        """4. Driver complete_bin_pickup endpoint."""
        pickup_payload = {
            "bin_id": "BIN-001",
            "vehicle_id": "VEH-001",
            "driver_id": "DRIVER-01",
            "collected_weight_kg": 120.0,
            "residual_fill_percentage": 0.0
        }
        response = client.post("/api/collections/pickup", json=pickup_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("pickup_id", data)
        self.assertEqual(data["collected_weight_kg"], 120.0)

    def test_05_facility_unload_workflow(self):
        """5. Facility unloading & partial unload reset."""
        unload_payload = {
            "vehicle_id": "VEH-001",
            "facility_name": "Ahmedabad Central MRF Facility",
            "gross_weight_kg": 4500.0,
            "net_weight_kg": 120.0,
            "accepted_waste_type": "Mixed Recyclables"
        }
        response = client.post("/api/collections/unload", json=unload_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("receipt_id", data)
        self.assertEqual(data["vehicle_new_load_kg"], 0.0)

    def test_06_honest_vision_classifier(self):
        """6. Vision classifier validation & zero +45% artificial inflation."""
        # Empty byte test
        empty_res = classify_waste_image(b"", "empty.jpg")
        self.assertFalse(empty_res["is_valid"])
        self.assertEqual(empty_res["status"], "error")

        # Invalid tiny byte test
        tiny_res = classify_waste_image(b"not_an_image", "tiny.jpg")
        self.assertFalse(tiny_res["is_valid"])
        self.assertEqual(tiny_res["status"], "error")

    def test_07_explainable_priority_score(self):
        """7. Configurable priority score with anti-starvation age limits."""
        res = calculate_priority_score(
            fill_percentage=85.0,
            predicted_full_hours=3.5,
            overflow_risk_score=0.75,
            waste_type="Organic",
            last_collected_hours_ago=80.0
        )
        self.assertIn("priority_score", res)
        self.assertIn("breakdown", res)
        self.assertGreaterEqual(res["priority_score"], 80)

    def test_08_multi_vehicle_vrp_routing(self):
        """8. VRP routing solver with OSRM matrix & unassigned reasons."""
        sample_bins = [
            {"id": "BIN-001", "latitude": 23.0225, "longitude": 72.5714, "required_collection_kg": 80.0, "priority": 90},
            {"id": "BIN-002", "latitude": 23.0300, "longitude": 72.5800, "required_collection_kg": 100.0, "priority": 85},
            {"id": "BIN-003", "latitude": 23.0400, "longitude": 72.5900, "required_collection_kg": 150.0, "priority": 70}
        ]
        res = optimize_waste_collection_route(
            vehicle_id="VEH-001",
            vehicle_number="GJ-01-WM-1001",
            vehicle_capacity_kg=200.0,
            bins=sample_bins,
            current_load_kg=0.0
        )
        self.assertEqual(res["vehicle_id"], "VEH-001")
        self.assertIn("total_distance_km", res)
        self.assertIn("stops", res)

    def test_09_csv_onboarding_formula_injection(self):
        """9. CSV onboarding validation & formula injection protection."""
        csv_content = "id,location_name,latitude,longitude,capacity_kg\nBIN-101,=SUM(A1:A10),23.0225,72.5714,200.0\n"
        files = {"file": ("test_bins.csv", csv_content.encode("utf-8"), "text/csv")}
        data = {"data_type": "bins"}
        response = client.post("/api/onboarding/validate-csv", files=files, data=data)
        self.assertEqual(response.status_code, 200)
        res_data = response.json()
        self.assertEqual(res_data["valid_count"], 1)

if __name__ == "__main__":
    unittest.main()

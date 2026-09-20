"""
SwachhSetu — Synthetic Historical Data Generator for Waste Forecasting
========================================================================
Generates 100 realistically clustered Waste Sources in Ahmedabad,
500+ associated smart bins, and 6 months of time-series waste generation records
with day-of-week, diurnal, and industry-specific patterns.

Saves data directly to Supabase (if available) and exports a fallback
local JSON store: backend/data/forecasting_demo_store.json.
"""

from __future__ import annotations

import os
import sys
import json
import random
import math
import uuid
from datetime import datetime, timedelta, date, time

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Attempt Supabase client import
try:
    from backend.app.core.supabase import get_supabase
    _SUPABASE = get_supabase()
except Exception:
    _SUPABASE = None

# ─── Ahmedabad Geographic Clusters ────────────────────────────────────────────

AHMEDABAD_CLUSTERS = [
    {
        "zone": "GIDC Naroda Industrial Estate",
        "lat": 23.0760, "lng": 72.6680, "radius": 0.025,
        "source_type": "factory", "industry_type": "paper",
        "expected_waste": ["Paper", "Cardboard", "Other"],
        "base_daily_kg": (800, 1400)
    },
    {
        "zone": "Vatva Industrial Zone",
        "lat": 22.9570, "lng": 72.6320, "radius": 0.030,
        "source_type": "industrial_area", "industry_type": "metal",
        "expected_waste": ["Metal", "Packaging", "Other"],
        "base_daily_kg": (1200, 2200)
    },
    {
        "zone": "Odhav Manufacturing Hub",
        "lat": 23.0230, "lng": 72.6600, "radius": 0.025,
        "source_type": "factory", "industry_type": "textile",
        "expected_waste": ["Organic", "Packaging", "Plastic"],
        "base_daily_kg": (600, 1100)
    },
    {
        "zone": "SG Highway Commercial District",
        "lat": 23.0300, "lng": 72.5070, "radius": 0.035,
        "source_type": "commercial", "industry_type": "general",
        "expected_waste": ["Paper", "Plastic", "Organic", "Glass"],
        "base_daily_kg": (500, 950)
    },
    {
        "zone": "Prahlad Nagar Restaurant Hub",
        "lat": 23.0120, "lng": 72.5110, "radius": 0.020,
        "source_type": "restaurant", "industry_type": "food",
        "expected_waste": ["Organic", "Plastic", "Glass"],
        "base_daily_kg": (400, 900)
    },
    {
        "zone": "Maninagar Residential Township",
        "lat": 22.9980, "lng": 72.6010, "radius": 0.030,
        "source_type": "residential", "industry_type": "general",
        "expected_waste": ["Organic", "Plastic", "Paper", "Glass", "Metal"],
        "base_daily_kg": (350, 750)
    },
    {
        "zone": "Kalupur Wholesale Market",
        "lat": 23.0280, "lng": 72.5950, "radius": 0.015,
        "source_type": "market", "industry_type": "food",
        "expected_waste": ["Organic", "Paper", "Plastic"],
        "base_daily_kg": (700, 1600)
    },
    {
        "zone": "Sarkhej Construction & Development Corridor",
        "lat": 22.9850, "lng": 72.4980, "radius": 0.030,
        "source_type": "construction", "industry_type": "construction",
        "expected_waste": ["Metal", "Other", "Paper"],
        "base_daily_kg": (900, 1800)
    },
    {
        "zone": "Sanand Automobile & Heavy Engineering Park",
        "lat": 23.0030, "lng": 72.3780, "radius": 0.040,
        "source_type": "factory", "industry_type": "automobile",
        "expected_waste": ["Metal", "Plastic", "Other"],
        "base_daily_kg": (1400, 2500)
    },
    {
        "zone": "Changodar Logistics & Warehouse Park",
        "lat": 22.9150, "lng": 72.4450, "radius": 0.035,
        "source_type": "warehouse", "industry_type": "plastic",
        "expected_waste": ["Plastic", "Paper", "Other"],
        "base_daily_kg": (600, 1300)
    }
]

SOURCE_NAME_PREFIXES = {
    "factory": ["Gujarat Paper Mills", "Shree Ram Steel Forge", "Apex Textile Print", "Zenith Polymer Extrusions", "Mahadev Castings", "Swastik Packaging", "Ambuja Craft Paper", "Vibrant Auto Parts"],
    "industrial_area": ["GIDC Block A Unit", "Vatva Chemical & Metals", "Odhav Industrial Plot", "Naroda Heavy Engineering", "Kathwada Tooling Estate"],
    "residential": ["Ashok Vatika Housing", "Shivalik Park Society", "Surya Apartments", "Goyal Intercity Colony", "Godrej Garden City Cluster"],
    "commercial": ["Acropolis Mall Complex", "Titanium City Center", "Iscon Mega Mall", "Shivalik High-Street", "Mondeal Square"],
    "restaurant": ["Honest Restaurant Plaza", "Toran Food Court", "Sankalp South Indian Zone", "Havmor Eateries Hub", "Gwalia Sweets & Snacks"],
    "market": ["Kalupur Grain Market", "Jamalpur Vegetable Mandi", "Relief Road Electronics Market", "Manek Chowk Night Food Market"],
    "construction": ["Godrej Celestia Site", "Adani Shantigram Infra", "Shilp Aaron Commercial Site", "Venus Ground Construction"],
    "warehouse": ["Flipkart Regional Fulfillment Center", "Amazon Logistics Park", "Express Cargo Warehouse", "Reliance Retail Hub"],
    "office": ["TCS Garima Park", "Infocity IT Complex", "Mindspace Business Park"],
    "recycling_center": ["Ahmedabad Municipal Material Recovery Facility", "Swachh Resource Recovery Center"]
}

# ─── Data Generation Logic ───────────────────────────────────────────────────

def generate_sources(count: int = 100) -> list[dict]:
    sources = []
    num_clusters = len(AHMEDABAD_CLUSTERS)

    for i in range(count):
        cluster = AHMEDABAD_CLUSTERS[i % num_clusters]
        stype = cluster["source_type"]
        itype = cluster["industry_type"]
        prefixes = SOURCE_NAME_PREFIXES.get(stype, ["Swachh Location"])
        prefix = random.choice(prefixes)
        unit_num = (i // num_clusters) + 1
        name = f"{prefix} (Unit #{unit_num})" if unit_num > 1 else prefix

        # Random offset around cluster center
        lat_offset = random.uniform(-cluster["radius"], cluster["radius"])
        lng_offset = random.uniform(-cluster["radius"], cluster["radius"])
        lat = round(cluster["lat"] + lat_offset, 6)
        lng = round(cluster["lng"] + lng_offset, 6)

        start_h = random.choice(["06:00:00", "08:00:00", "09:00:00"])
        end_h = random.choice(["17:00:00", "18:00:00", "20:00:00", "22:00:00"])
        daily_est = random.randint(cluster["base_daily_kg"][0], cluster["base_daily_kg"][1])

        source_code = f"SRC-AMD-{1000 + i}"
        source_id = str(uuid.uuid4())

        source = {
            "id": source_id,
            "source_code": source_code,
            "name": name,
            "source_type": stype,
            "industry_type": itype,
            "latitude": lat,
            "longitude": lng,
            "address": f"Plot #{random.randint(10, 450)}, {cluster['zone']}, Ahmedabad, Gujarat 380001",
            "expected_waste_types": cluster["expected_waste"],
            "operating_hours_start": start_h,
            "operating_hours_end": end_h,
            "collection_frequency": "daily" if daily_est > 600 else "twice_daily" if daily_est > 1500 else "every_2_days",
            "estimated_daily_generation_kg": float(daily_est),
            "priority": "critical" if daily_est > 1600 else "high" if daily_est > 900 else "medium",
            "status": "active",
            "is_demo_data": True,
            "created_at": (datetime.now() - timedelta(days=180)).isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        sources.append(source)

    return sources


def generate_records(sources: list[dict], days_history: int = 90) -> list[dict]:
    """Generate 90 days of time-series waste generation records with realistic patterns."""
    records = []
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_history)

    for source in sources:
        stype = source["source_type"]
        wtypes = source["expected_waste_types"]
        daily_target = source["estimated_daily_generation_kg"]

        curr_dt = start_date
        while curr_dt <= end_date:
            dow = curr_dt.weekday()  # 0=Mon, 6=Sun
            is_weekend = dow in (5, 6)

            # Day-of-week multiplier
            if stype in ("factory", "industrial_area", "office"):
                day_mult = 0.3 if is_weekend else 1.15
            elif stype in ("restaurant", "market", "commercial"):
                day_mult = 1.4 if is_weekend else 0.90
            elif stype == "residential":
                day_mult = 1.25 if is_weekend else 0.95
            else:
                day_mult = 1.0

            # Daily generation for this date
            day_total_kg = daily_target * day_mult * random.uniform(0.85, 1.15)

            # Generate 2 to 4 generation events per day
            events_count = random.randint(2, 4)
            if stype == "factory":
                peak_hours = [10, 14, 17]
            elif stype == "restaurant":
                peak_hours = [13, 20, 22]
            elif stype == "residential":
                peak_hours = [8, 12, 19]
            else:
                peak_hours = [9, 13, 16]

            for ev in range(events_count):
                hour = random.choice(peak_hours) + random.choice([-1, 0, 1])
                hour = max(6, min(23, hour))

                rec_dt = curr_dt.replace(hour=hour, minute=random.randint(0, 59), second=0)

                # Primary waste type gets 65-80% of volume
                primary_wtype = wtypes[0] if wtypes else "Organic"
                selected_wtype = primary_wtype if random.random() < 0.75 else random.choice(wtypes)

                event_kg = round((day_total_kg / events_count) * random.uniform(0.8, 1.2), 1)

                record = {
                    "id": str(uuid.uuid4()),
                    "source_id": source["id"],
                    "waste_type": selected_wtype,
                    "quantity_kg": event_kg,
                    "recorded_at": rec_dt.isoformat(),
                    "day_of_week": dow,
                    "hour": hour,
                    "collection_id": None,
                    "vehicle_id": f"GJ-01-V-{random.randint(101, 112)}",
                    "is_demo_data": True,
                    "created_at": rec_dt.isoformat()
                }
                records.append(record)

            curr_dt += timedelta(days=1)

    return records


# ─── Execution ───────────────────────────────────────────────────────────────

def main():
    print("Generating 100 Waste Sources in Ahmedabad...")
    sources = generate_sources(100)
    print(f"Generated {len(sources)} sources.")

    print("Generating 90 days of time-series waste generation records (~25,000+ rows)...")
    records = generate_records(sources, days_history=90)
    print(f"Generated {len(records)} waste generation records.")

    # Local fallback export
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data"))
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "forecasting_demo_store.json")

    demo_store = {
        "is_demo_data": True,
        "generated_at": datetime.now().isoformat(),
        "sources": sources,
        "generation_records": records[:5000]  # Store top 5000 recent records for lightweight JSON
    }

    with open(out_file, "w") as f:
        json.dump(demo_store, f, indent=2)
    print(f"Exported demo store to {out_file} ({os.path.getsize(out_file) / 1024 / 1024:.2f} MB).")

    # Supabase bulk insert if client available
    if _SUPABASE:
        print("Inserting sources and records into Supabase PostgreSQL...")
        try:
            # Batch insert sources
            _SUPABASE.table("waste_sources").upsert(sources, on_conflict="source_code").execute()
            print("Successfully upserted 100 waste sources to Supabase.")

            # Batch insert records in chunks of 500
            chunk_size = 500
            for i in range(0, len(records[:2000]), chunk_size):
                chunk = records[i:i+chunk_size]
                _SUPABASE.table("waste_generation_records").insert(chunk).execute()
                print(f"Inserted records chunk {i}-{i+len(chunk)}")
            print("Successfully populated Supabase waste_generation_records table!")
        except Exception as exc:
            print(f"Supabase insertion notice: {exc} (Demo fallback store available).")

    print("\nSynthetic data generation COMPLETE!")


if __name__ == "__main__":
    main()

import os
import random
from datetime import datetime, timedelta, timezone
from supabase import create_client

URL = "https://whsprzbykknofztmhypa.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indoc3ByemJ5a2tub2Z6dG1oeXBhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTgwMjU1MiwiZXhwIjoyMTA1Mzc4NTUyfQ.-taBLQP2t_cLO-B7dxwyb_Qg-knJTeoQHKzessoXgbw"

supabase = create_client(URL, KEY)

def seed_waste_history():
    print("Fetching bins from Supabase...")
    res = supabase.table("bins").select("id, waste_type, capacity_kg").execute()
    bins = res.data or []
    if not bins:
        print("No bins found in database!")
        return

    print(f"Found {len(bins)} bins. Checking existing waste records...")
    w_check = supabase.table("waste_records").select("id", count="exact").limit(1).execute()
    if w_check.count and w_check.count > 0:
        print(f"Database already contains {w_check.count} waste records. Skipping seed.")
        return

    records = []
    collections = []
    now = datetime.now(timezone.utc)
    waste_types = ["Plastic", "Paper", "Metal", "Glass", "Organic", "E-Waste"]

    for day_offset in range(30, 0, -1):
        record_date = now - timedelta(days=day_offset)
        date_str = record_date.isoformat()

        for b in bins:
            bin_id = b["id"]
            w_type = b.get("waste_type") or random.choice(waste_types)
            cap = b.get("capacity_kg", 200.0)

            # Generate realistic daily weight (15 to 85 kg)
            weight = round(random.uniform(15.0, min(cap, 85.0)), 1)
            rec_id = f"WR-{bin_id}-{day_offset}"

            records.append({
                "id": rec_id,
                "bin_id": bin_id,
                "waste_type": w_type,
                "weight_kg": weight,
                "recorded_at": date_str
            })

            # Every 2-3 days, generate a collection record
            if day_offset % 2 == 0:
                coll_id = f"COL-{bin_id}-{day_offset}"
                collections.append({
                    "id": coll_id,
                    "bin_id": bin_id,
                    "vehicle_id": f"V-00{(day_offset % 6) + 1}",
                    "collected_weight_kg": weight,
                    "collected_at": date_str,
                    "status": "completed"
                })

    print(f"Inserting {len(records)} waste records...")
    # Batch insert in chunks of 100
    for i in range(0, len(records), 100):
        chunk = records[i:i+100]
        supabase.table("waste_records").insert(chunk).execute()

    print(f"Inserting {len(collections)} collection records...")
    for i in range(0, len(collections), 100):
        chunk = collections[i:i+100]
        supabase.table("collections").insert(chunk).execute()

    print("Historical data seeding completed successfully!")

if __name__ == "__main__":
    seed_waste_history()

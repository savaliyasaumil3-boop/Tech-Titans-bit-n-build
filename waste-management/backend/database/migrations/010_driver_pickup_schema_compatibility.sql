ALTER TABLE collection_events
  ADD COLUMN IF NOT EXISTS measurement_method VARCHAR(16) DEFAULT 'measured',
  ADD COLUMN IF NOT EXISTS collection_outcome VARCHAR(16) DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS remaining_waste_kg DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_path TEXT;

ALTER TABLE route_issues
  ADD COLUMN IF NOT EXISTS collected_weight_kg DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_waste_kg DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_path TEXT;

ALTER TABLE facility_receipts
  ADD COLUMN IF NOT EXISTS receipt_reference TEXT,
  ADD COLUMN IF NOT EXISTS material_breakdown JSONB DEFAULT '{}';

CREATE TABLE IF NOT EXISTS route_issues (
    id VARCHAR(96) PRIMARY KEY,
    route_plan_id VARCHAR(64) REFERENCES route_plans(id) ON DELETE CASCADE,
    stop_id VARCHAR(64) REFERENCES route_stops(id) ON DELETE SET NULL,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id VARCHAR(64) NOT NULL,
    issue_type VARCHAR(32) NOT NULL,
    notes TEXT NOT NULL,
    collected_weight_kg DOUBLE PRECISION DEFAULT 0,
    remaining_waste_kg DOUBLE PRECISION DEFAULT 0,
    photo_path TEXT,
    status VARCHAR(24) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

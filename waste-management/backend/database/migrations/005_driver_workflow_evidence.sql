ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS access_instructions TEXT;
ALTER TABLE collection_events ADD COLUMN IF NOT EXISTS measurement_method VARCHAR(16) DEFAULT 'measured';
ALTER TABLE collection_events ADD COLUMN IF NOT EXISTS collection_outcome VARCHAR(16) DEFAULT 'completed';
ALTER TABLE collection_events ADD COLUMN IF NOT EXISTS remaining_waste_kg DOUBLE PRECISION DEFAULT 0;
ALTER TABLE collection_events ADD COLUMN IF NOT EXISTS collection_notes TEXT;
ALTER TABLE collection_events ADD COLUMN IF NOT EXISTS photo_path TEXT;
ALTER TABLE facility_receipts ADD COLUMN IF NOT EXISTS receipt_reference TEXT;
ALTER TABLE route_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

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

ALTER TABLE route_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drivers create own route issues" ON route_issues FOR INSERT TO authenticated WITH CHECK (driver_id = public.current_driver_id());
CREATE POLICY "drivers read own route issues" ON route_issues FOR SELECT TO authenticated USING (driver_id = public.current_driver_id() OR public.is_supervisor());
CREATE POLICY "supervisors update route issues" ON route_issues FOR UPDATE TO authenticated USING (public.is_supervisor()) WITH CHECK (public.is_supervisor());
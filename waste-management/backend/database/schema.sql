-- ==============================================================================
-- SwachhSetu PostgreSQL Database Schema for Supabase
-- Supports Alphanumeric IDs (BIN-001, VH-001, ALT-001) + RLS Public Policies
-- ==============================================================================

-- 1. Drop existing tables if re-creating
DROP TABLE IF EXISTS collections CASCADE;
DROP TABLE IF EXISTS waste_records CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS bins CASCADE;

-- 2. Create Bins Table
CREATE TABLE bins (
    id VARCHAR(64) PRIMARY KEY,
    location_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    capacity_kg DOUBLE PRECISION NOT NULL DEFAULT 160.0,
    current_fill_kg DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    fill_percentage DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    waste_type VARCHAR(32) NOT NULL DEFAULT 'Plastic',
    status VARCHAR(32) NOT NULL DEFAULT 'healthy',
    predicted_full_hours DOUBLE PRECISION DEFAULT 24.0,
    priority_score INTEGER DEFAULT 10,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Vehicles Table
CREATE TABLE vehicles (
    id VARCHAR(64) PRIMARY KEY,
    vehicle_number VARCHAR(64) NOT NULL,
    vehicle_type VARCHAR(64) NOT NULL DEFAULT 'Compactor Truck',
    capacity_kg DOUBLE PRECISION NOT NULL DEFAULT 5000.0,
    current_load_kg DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'available',
    driver_name VARCHAR(128) NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Alerts Table
CREATE TABLE alerts (
    id VARCHAR(64) PRIMARY KEY,
    bin_id VARCHAR(64) REFERENCES bins(id) ON DELETE SET NULL,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    type VARCHAR(32) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Predictions Table
CREATE TABLE predictions (
    id VARCHAR(64) PRIMARY KEY,
    bin_id VARCHAR(64) REFERENCES bins(id) ON DELETE CASCADE,
    predicted_full_hours DOUBLE PRECISION NOT NULL,
    predicted_fill_percentage DOUBLE PRECISION NOT NULL,
    overflow_probability DOUBLE PRECISION NOT NULL,
    prediction_created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Waste Records (Analytics History)
CREATE TABLE waste_records (
    id VARCHAR(64) PRIMARY KEY,
    bin_id VARCHAR(64) REFERENCES bins(id) ON DELETE SET NULL,
    waste_type VARCHAR(32) NOT NULL,
    weight_kg DOUBLE PRECISION NOT NULL,
    is_quarantined BOOLEAN DEFAULT false,
    quarantine_reason TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Collections Table (Legacy & compatibility)
CREATE TABLE collections (
    id VARCHAR(64) PRIMARY KEY,
    bin_id VARCHAR(64) REFERENCES bins(id) ON DELETE SET NULL,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    collected_weight_kg DOUBLE PRECISION NOT NULL,
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(32) DEFAULT 'completed'
);

-- 8. Create Observations Table (Raw IoT Telemetry)
CREATE TABLE observations (
    id VARCHAR(64) PRIMARY KEY,
    bin_id VARCHAR(64) REFERENCES bins(id) ON DELETE CASCADE,
    site_id VARCHAR(64) DEFAULT 'AMC-CENTRAL-01',
    device_id VARCHAR(64),
    operator_id VARCHAR(64),
    fill_percentage DOUBLE PRECISION NOT NULL,
    measured_weight_kg DOUBLE PRECISION,
    estimated_weight_kg DOUBLE PRECISION,
    estimation_method VARCHAR(64) DEFAULT 'sensor_ultrasonic_volumetric',
    weight_units VARCHAR(16) DEFAULT 'kg',
    battery_percentage DOUBLE PRECISION,
    signal_dbm DOUBLE PRECISION,
    temperature_c DOUBLE PRECISION,
    source_type VARCHAR(32) DEFAULT 'ultrasonic_sensor',
    data_quality_flags JSONB DEFAULT '{"valid": true, "noisy": false}'::jsonb,
    idempotency_key VARCHAR(128) UNIQUE,
    observed_at TIMESTAMPTZ DEFAULT NOW(),
    received_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create Collection Events Table
CREATE TABLE collection_events (
    id VARCHAR(64) PRIMARY KEY,
    bin_id VARCHAR(64) REFERENCES bins(id) ON DELETE SET NULL,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id VARCHAR(64),
    route_plan_id VARCHAR(64),
    stop_id VARCHAR(64),
    collected_weight_kg DOUBLE PRECISION NOT NULL,
    residual_fill_percentage DOUBLE PRECISION DEFAULT 0.0,
    collection_notes TEXT,
    status VARCHAR(32) DEFAULT 'completed',
    collected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create Facilities Table
CREATE TABLE facilities (
    id VARCHAR(64) PRIMARY KEY,
    name TEXT NOT NULL,
    facility_type VARCHAR(32) DEFAULT 'MRF',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    material_acceptance_rules JSONB DEFAULT '["Plastic", "Paper", "Metal", "Glass", "Organic"]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Create Facility Receipts Table
CREATE TABLE facility_receipts (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(64) REFERENCES facilities(id) ON DELETE SET NULL,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id VARCHAR(64),
    facility_name TEXT NOT NULL,
    gross_weight_kg DOUBLE PRECISION NOT NULL,
    tare_weight_kg DOUBLE PRECISION DEFAULT 0.0,
    net_weight_kg DOUBLE PRECISION NOT NULL,
    material_breakdown JSONB DEFAULT '{}'::jsonb,
    accepted_waste_type VARCHAR(64) DEFAULT 'Mixed Recyclable',
    acceptance_status VARCHAR(32) DEFAULT 'accepted',
    status VARCHAR(32) DEFAULT 'processed',
    unloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Create Route Plans & Route Stops Tables
CREATE TABLE route_plans (
    id VARCHAR(64) PRIMARY KEY,
    fleet_plan_id VARCHAR(64),
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id VARCHAR(64),
    status VARCHAR(32) DEFAULT 'draft',
    total_distance_km DOUBLE PRECISION DEFAULT 0.0,
    estimated_time_minutes INTEGER DEFAULT 0,
    routing_source VARCHAR(32) DEFAULT 'osrm_road_matrix',
    stops_json JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    dispatched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE route_stops (
    id VARCHAR(64) PRIMARY KEY,
    route_plan_id VARCHAR(64) REFERENCES route_plans(id) ON DELETE CASCADE,
    bin_id VARCHAR(64) REFERENCES bins(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    planned_load_kg DOUBLE PRECISION DEFAULT 0.0,
    eta TIMESTAMPTZ,
    status VARCHAR(32) DEFAULT 'pending',
    collection_event_id VARCHAR(64) REFERENCES collection_events(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Row Level Security (RLS) & Permissions
-- Allows anon key to read, insert, and update for dashboard and IoT telemetry
-- ==============================================================================

ALTER TABLE bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Bins" ON bins FOR SELECT USING (true);
CREATE POLICY "Public Insert Bins" ON bins FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Bins" ON bins FOR UPDATE USING (true);

CREATE POLICY "Public Read Vehicles" ON vehicles FOR SELECT USING (true);
CREATE POLICY "Public Update Vehicles" ON vehicles FOR UPDATE USING (true);

CREATE POLICY "Public Read Alerts" ON alerts FOR SELECT USING (true);
CREATE POLICY "Public Insert Alerts" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Alerts" ON alerts FOR UPDATE USING (true);

CREATE POLICY "Public Read Predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Public Insert Predictions" ON predictions FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Waste Records" ON waste_records FOR SELECT USING (true);
CREATE POLICY "Public Insert Waste Records" ON waste_records FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Collections" ON collections FOR SELECT USING (true);
CREATE POLICY "Public Insert Collections" ON collections FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Observations" ON observations FOR SELECT USING (true);
CREATE POLICY "Public Insert Observations" ON observations FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Collection Events" ON collection_events FOR SELECT USING (true);
CREATE POLICY "Public Insert Collection Events" ON collection_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Facilities" ON facilities FOR SELECT USING (true);
CREATE POLICY "Public Read Facility Receipts" ON facility_receipts FOR SELECT USING (true);
CREATE POLICY "Public Insert Facility Receipts" ON facility_receipts FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Route Plans" ON route_plans FOR SELECT USING (true);
CREATE POLICY "Public Write Route Plans" ON route_plans FOR ALL WITH CHECK (true);

CREATE POLICY "Public Read Route Stops" ON route_stops FOR SELECT USING (true);
CREATE POLICY "Public Write Route Stops" ON route_stops FOR ALL WITH CHECK (true);

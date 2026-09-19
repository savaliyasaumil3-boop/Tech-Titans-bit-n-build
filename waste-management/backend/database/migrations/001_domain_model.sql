-- ==============================================================================
-- SwachhSetu Migration 001: Expanded Domain Model (Additive)
-- Adds Observations, Route Plans, Ordered Route Stops, Facilities, Receipts & Quarantine
-- ==============================================================================

-- 1. Observations Table (Raw telemetry & manual readings with rich provenance)
CREATE TABLE IF NOT EXISTS observations (
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

-- Ensure columns exist if table was already created
ALTER TABLE observations ADD COLUMN IF NOT EXISTS site_id VARCHAR(64) DEFAULT 'AMC-CENTRAL-01';
ALTER TABLE observations ADD COLUMN IF NOT EXISTS device_id VARCHAR(64);
ALTER TABLE observations ADD COLUMN IF NOT EXISTS operator_id VARCHAR(64);
ALTER TABLE observations ADD COLUMN IF NOT EXISTS estimated_weight_kg DOUBLE PRECISION;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS estimation_method VARCHAR(64) DEFAULT 'sensor_ultrasonic_volumetric';
ALTER TABLE observations ADD COLUMN IF NOT EXISTS weight_units VARCHAR(16) DEFAULT 'kg';
ALTER TABLE observations ADD COLUMN IF NOT EXISTS signal_dbm DOUBLE PRECISION;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS data_quality_flags JSONB DEFAULT '{"valid": true, "noisy": false}'::jsonb;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128) UNIQUE;

-- 2. Collection Events Table (Completed bin pickups with residual fill & audit evidence)
CREATE TABLE IF NOT EXISTS collection_events (
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

ALTER TABLE collection_events ADD COLUMN IF NOT EXISTS route_plan_id VARCHAR(64);
ALTER TABLE collection_events ADD COLUMN IF NOT EXISTS stop_id VARCHAR(64);
ALTER TABLE collection_events ADD COLUMN IF NOT EXISTS collection_notes TEXT;

-- 3. Route Plans & Route Stops Tables
CREATE TABLE IF NOT EXISTS route_plans (
    id VARCHAR(64) PRIMARY KEY,
    fleet_plan_id VARCHAR(64),
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id VARCHAR(64),
    status VARCHAR(32) DEFAULT 'draft', -- draft, dispatched, active, completed, cancelled
    total_distance_km DOUBLE PRECISION DEFAULT 0.0,
    estimated_time_minutes INTEGER DEFAULT 0,
    routing_source VARCHAR(32) DEFAULT 'osrm_road_matrix',
    stops_json JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    dispatched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

ALTER TABLE route_plans ADD COLUMN IF NOT EXISTS fleet_plan_id VARCHAR(64);
ALTER TABLE route_plans ADD COLUMN IF NOT EXISTS routing_source VARCHAR(32) DEFAULT 'osrm_road_matrix';
ALTER TABLE route_plans ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE route_plans ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Persisted Ordered Route Stops (Individual stable records linked to route_plans)
CREATE TABLE IF NOT EXISTS route_stops (
    id VARCHAR(64) PRIMARY KEY,
    route_plan_id VARCHAR(64) REFERENCES route_plans(id) ON DELETE CASCADE,
    bin_id VARCHAR(64) REFERENCES bins(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    planned_load_kg DOUBLE PRECISION DEFAULT 0.0,
    eta TIMESTAMPTZ,
    status VARCHAR(32) DEFAULT 'pending', -- pending, skipped, failed, completed
    collection_event_id VARCHAR(64) REFERENCES collection_events(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Structured Facilities & Receipts
CREATE TABLE IF NOT EXISTS facilities (
    id VARCHAR(64) PRIMARY KEY,
    name TEXT NOT NULL,
    facility_type VARCHAR(32) DEFAULT 'MRF', -- MRF, Composting, Landfill, Transfer
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    material_acceptance_rules JSONB DEFAULT '["Plastic", "Paper", "Metal", "Glass", "Organic"]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facility_receipts (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(64) REFERENCES facilities(id) ON DELETE SET NULL,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id VARCHAR(64),
    facility_name TEXT NOT NULL,
    gross_weight_kg DOUBLE PRECISION NOT NULL,
    tare_weight_kg DOUBLE PRECISION DEFAULT 0.0,
    net_weight_kg DOUBLE PRECISION NOT NULL,
    material_breakdown JSONB DEFAULT '{}'::jsonb,
    acceptance_status VARCHAR(32) DEFAULT 'accepted',
    unloaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE facility_receipts ADD COLUMN IF NOT EXISTS facility_id VARCHAR(64) REFERENCES facilities(id) ON DELETE SET NULL;
ALTER TABLE facility_receipts ADD COLUMN IF NOT EXISTS driver_id VARCHAR(64);
ALTER TABLE facility_receipts ADD COLUMN IF NOT EXISTS tare_weight_kg DOUBLE PRECISION DEFAULT 0.0;

-- 5. Legacy Waste Records Quarantine Flag
ALTER TABLE waste_records ADD COLUMN IF NOT EXISTS is_quarantined BOOLEAN DEFAULT false;
ALTER TABLE waste_records ADD COLUMN IF NOT EXISTS quarantine_reason TEXT;

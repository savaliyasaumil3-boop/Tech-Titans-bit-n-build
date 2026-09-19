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
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Collections Table
CREATE TABLE collections (
    id VARCHAR(64) PRIMARY KEY,
    bin_id VARCHAR(64) REFERENCES bins(id) ON DELETE SET NULL,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    collected_weight_kg DOUBLE PRECISION NOT NULL,
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(32) DEFAULT 'completed'
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
CREATE POLICY "Public Read Collections" ON collections FOR SELECT USING (true);

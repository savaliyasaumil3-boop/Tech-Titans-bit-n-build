-- ==============================================================================
-- SwachhSetu Migration 003: Audit Logging & Onboarding Provenance
-- ==============================================================================

-- 1. Audit Logs Table (Captures dispatch, configuration, and manual overrides)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    user_role VARCHAR(32),
    action_type VARCHAR(64) NOT NULL, -- e.g. DISPATCH_ROUTE, PICKUP_BIN, UPDATE_SETTINGS, MANUAL_OVERRIDE
    resource_type VARCHAR(32) NOT NULL, -- e.g. BINS, VEHICLES, ROUTES, SETTINGS
    resource_id VARCHAR(64),
    payload JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Data Onboarding Import Batches (Captures CSV imports & manual onboarding)
CREATE TABLE IF NOT EXISTS onboarding_batches (
    id VARCHAR(64) PRIMARY KEY,
    operator_id VARCHAR(64),
    data_type VARCHAR(32) NOT NULL, -- BINS, VEHICLES, OBSERVATIONS, COLLECTIONS
    file_name TEXT,
    row_count INTEGER DEFAULT 0,
    valid_count INTEGER DEFAULT 0,
    rejected_count INTEGER DEFAULT 0,
    provenance_source TEXT DEFAULT 'manual_csv_import',
    status VARCHAR(32) DEFAULT 'completed', -- pending, completed, failed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Audit Logs" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Public Read Onboarding Batches" ON onboarding_batches FOR SELECT USING (true);
CREATE POLICY "Service Role Write Audit Logs" ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service Role Write Onboarding Batches" ON onboarding_batches FOR INSERT WITH CHECK (true);

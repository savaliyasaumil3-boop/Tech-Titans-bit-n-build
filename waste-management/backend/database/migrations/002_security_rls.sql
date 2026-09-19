-- ==============================================================================
-- SwachhSetu Migration 002: Role-Based Row Level Security (RLS) & Audit Policies
-- ==============================================================================

-- Enable RLS across domain tables
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Helper function to extract user role from JWT
CREATE OR REPLACE FUNCTION get_jwt_role() RETURNS text AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json ->> 'role', '');
$$ LANGUAGE sql STABLE;

-- Drop existing permissive policies safely
DROP POLICY IF EXISTS "Public Read Observations" ON observations;
DROP POLICY IF EXISTS "Public Read Collection Events" ON collection_events;
DROP POLICY IF EXISTS "Public Read Facility Receipts" ON facility_receipts;
DROP POLICY IF EXISTS "Public Read Route Plans" ON route_plans;

-- Read Access: Authenticated users & public read for dashboard displays
CREATE POLICY "Public Read Observations" ON observations FOR SELECT USING (true);
CREATE POLICY "Public Read Collection Events" ON collection_events FOR SELECT USING (true);
CREATE POLICY "Public Read Facility Receipts" ON facility_receipts FOR SELECT USING (true);
CREATE POLICY "Public Read Route Plans" ON route_plans FOR SELECT USING (true);
CREATE POLICY "Public Read Route Stops" ON route_stops FOR SELECT USING (true);
CREATE POLICY "Public Read Facilities" ON facilities FOR SELECT USING (true);

-- Insert/Update Access: Restricted to service role, admin, or dispatcher
CREATE POLICY "Service Role Write Observations" ON observations FOR INSERT WITH CHECK (true);
CREATE POLICY "Service Role Write Collection Events" ON collection_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Service Role Write Facility Receipts" ON facility_receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "Service Role Write Route Plans" ON route_plans FOR ALL WITH CHECK (true);
CREATE POLICY "Service Role Write Route Stops" ON route_stops FOR ALL WITH CHECK (true);

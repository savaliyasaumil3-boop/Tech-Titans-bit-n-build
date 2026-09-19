CREATE TABLE IF NOT EXISTS stop_checklist_items (
    id VARCHAR(128) PRIMARY KEY,
    route_plan_id VARCHAR(64) NOT NULL REFERENCES route_plans(id) ON DELETE CASCADE,
    route_stop_id VARCHAR(64) NOT NULL REFERENCES route_stops(id) ON DELETE CASCADE,
    driver_id VARCHAR(64) NOT NULL,
    checklist_key VARCHAR(48) NOT NULL,
    label TEXT NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(route_stop_id, checklist_key)
);

ALTER TABLE stop_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drivers read own stop checklists" ON stop_checklist_items FOR SELECT TO authenticated USING (driver_id = public.current_driver_id());
CREATE POLICY "drivers update own stop checklists" ON stop_checklist_items FOR UPDATE TO authenticated USING (driver_id = public.current_driver_id()) WITH CHECK (driver_id = public.current_driver_id());
CREATE POLICY "supervisors manage checklists" ON stop_checklist_items FOR ALL TO authenticated USING (public.is_supervisor()) WITH CHECK (public.is_supervisor());
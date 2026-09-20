-- ==============================================================================
-- SwachhSetu — waste_classifications Table Migration
-- Run this in your Supabase SQL Editor ONCE before using the
-- AI Waste Classification feature.
-- ==============================================================================

-- Create table
CREATE TABLE IF NOT EXISTS waste_classifications (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url    TEXT,                          -- optional: Supabase Storage URL
    predicted_class TEXT        NOT NULL,
    confidence   DOUBLE PRECISION NOT NULL,     -- 0.0 – 1.0
    top_predictions JSONB       NOT NULL DEFAULT '[]'::jsonb,
    is_confident BOOLEAN        NOT NULL DEFAULT true,
    is_demo_mode BOOLEAN        NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE waste_classifications ENABLE ROW LEVEL SECURITY;

-- Allow any anonymous caller to read (for dashboard / analytics)
CREATE POLICY "Public Read WasteClassifications"
    ON waste_classifications FOR SELECT USING (true);

-- Allow any anonymous caller to insert (classification saves)
CREATE POLICY "Public Insert WasteClassifications"
    ON waste_classifications FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- Optional: create the waste-images storage bucket for image uploads
-- ==============================================================================
-- Run this separately if you want to store the actual uploaded images:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('waste-images', 'waste-images', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- CREATE POLICY "Public Read waste-images"
--   ON storage.objects FOR SELECT USING (bucket_id = 'waste-images');
-- CREATE POLICY "Public Upload waste-images"
--   ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'waste-images');

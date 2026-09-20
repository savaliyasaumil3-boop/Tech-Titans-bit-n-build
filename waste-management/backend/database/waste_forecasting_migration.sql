-- SwachhSetu — Location-Wise Waste Generation Forecasting & Supervisor Planning Migration
-- Creates tables: waste_sources, waste_generation_records, waste_forecasts, source_collection_history

-- 1. Waste Sources Table
CREATE TABLE IF NOT EXISTS public.waste_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- factory, industrial_area, residential, commercial, restaurant, market, construction, office, warehouse, recycling_center, other
    industry_type VARCHAR(50) NOT NULL DEFAULT 'general', -- paper, metal, textile, food, plastic, automobile, chemical, construction, general, none
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT NOT NULL,
    expected_waste_types TEXT[] NOT NULL DEFAULT '{}',
    operating_hours_start TIME DEFAULT '08:00:00',
    operating_hours_end TIME DEFAULT '18:00:00',
    collection_frequency VARCHAR(50) DEFAULT 'daily',
    estimated_daily_generation_kg DOUBLE PRECISION NOT NULL DEFAULT 500.0,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'active',
    is_demo_data BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for spatial & filtering queries
CREATE INDEX IF NOT EXISTS idx_waste_sources_source_type ON public.waste_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_waste_sources_industry_type ON public.waste_sources(industry_type);
CREATE INDEX IF NOT EXISTS idx_waste_sources_status ON public.waste_sources(status);

-- 2. Waste Generation Records Table (Main Historical Dataset)
CREATE TABLE IF NOT EXISTS public.waste_generation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.waste_sources(id) ON DELETE CASCADE,
    waste_type VARCHAR(50) NOT NULL,
    quantity_kg DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    day_of_week INT NOT NULL, -- 0=Sunday, 1=Monday... 6=Saturday
    hour INT NOT NULL, -- 0-23
    collection_id UUID,
    vehicle_id VARCHAR(50),
    is_demo_data BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waste_gen_source_recorded ON public.waste_generation_records(source_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_waste_gen_recorded_at ON public.waste_generation_records(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_waste_gen_waste_type ON public.waste_generation_records(waste_type);

-- 3. Waste Forecasts Table
CREATE TABLE IF NOT EXISTS public.waste_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.waste_sources(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    forecast_hour INT NOT NULL,
    predicted_quantity_kg DOUBLE PRECISION NOT NULL,
    predicted_waste_type VARCHAR(50) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    lower_bound_kg DOUBLE PRECISION NOT NULL,
    upper_bound_kg DOUBLE PRECISION NOT NULL,
    peak_generation_hour INT DEFAULT 14,
    overflow_risk VARCHAR(20) DEFAULT 'Low', -- Low, Medium, High, Critical
    priority VARCHAR(20) DEFAULT 'medium',
    model_version VARCHAR(50) DEFAULT 'RF-v1.0',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waste_forecasts_source_date ON public.waste_forecasts(source_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_waste_forecasts_overflow_risk ON public.waste_forecasts(overflow_risk);

-- 4. Source Collection History Table
CREATE TABLE IF NOT EXISTS public.source_collection_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.waste_sources(id) ON DELETE CASCADE,
    vehicle_id VARCHAR(50) NOT NULL,
    driver_id VARCHAR(100),
    waste_type VARCHAR(50) NOT NULL,
    collected_quantity_kg DOUBLE PRECISION NOT NULL,
    predicted_quantity_kg DOUBLE PRECISION,
    prediction_error_kg DOUBLE PRECISION,
    collection_started_at TIMESTAMPTZ,
    collection_completed_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_coll_history_source ON public.source_collection_history(source_id);

-- Enable Row Level Security (RLS) policies
ALTER TABLE public.waste_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_generation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_collection_history ENABLE ROW LEVEL SECURITY;

-- Allow public reading for dashboard features, restricted writes
CREATE POLICY "Allow public read waste_sources" ON public.waste_sources FOR SELECT USING (true);
CREATE POLICY "Allow public read waste_generation_records" ON public.waste_generation_records FOR SELECT USING (true);
CREATE POLICY "Allow public read waste_forecasts" ON public.waste_forecasts FOR SELECT USING (true);
CREATE POLICY "Allow public read source_collection_history" ON public.source_collection_history FOR SELECT USING (true);

CREATE POLICY "Allow service role all waste_sources" ON public.waste_sources FOR ALL USING (true);
CREATE POLICY "Allow service role all waste_generation_records" ON public.waste_generation_records FOR ALL USING (true);
CREATE POLICY "Allow service role all waste_forecasts" ON public.waste_forecasts FOR ALL USING (true);
CREATE POLICY "Allow service role all source_collection_history" ON public.source_collection_history FOR ALL USING (true);

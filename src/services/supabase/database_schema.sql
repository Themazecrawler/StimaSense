-- StimaSense Database Schema
-- This file contains all the necessary tables for the power outage prediction app

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,
    notification_preferences JSONB DEFAULT '{
        "push_enabled": true,
        "email_enabled": true,
        "sms_enabled": false,
        "outage_alerts": true,
        "weather_alerts": true,
        "maintenance_alerts": true,
        "quiet_hours_start": null,
        "quiet_hours_end": null
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outage reports table
CREATE TABLE IF NOT EXISTS outage_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    location_address TEXT NOT NULL,
    outage_type TEXT CHECK (outage_type IN ('planned', 'unplanned', 'weather', 'equipment')) NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    description TEXT NOT NULL,
    affected_customers INTEGER,
    estimated_duration TEXT,
    status TEXT CHECK (status IN ('active', 'investigating', 'resolved')) DEFAULT 'active',
    photos TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Weather data table
CREATE TABLE IF NOT EXISTS weather_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    temperature DECIMAL(5, 2) NOT NULL,
    humidity INTEGER CHECK (humidity >= 0 AND humidity <= 100) NOT NULL,
    wind_speed DECIMAL(6, 2) NOT NULL,
    wind_direction INTEGER CHECK (wind_direction >= 0 AND wind_direction <= 360) NOT NULL,
    precipitation DECIMAL(6, 2) DEFAULT 0,
    pressure DECIMAL(7, 2) NOT NULL,
    visibility DECIMAL(6, 2) NOT NULL,
    weather_condition TEXT NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    weather_data_id UUID REFERENCES weather_data(id) ON DELETE SET NULL,
    outage_probability DECIMAL(5, 4) CHECK (outage_probability >= 0 AND outage_probability <= 1) NOT NULL,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    confidence_score DECIMAL(5, 4) CHECK (confidence_score >= 0 AND confidence_score <= 1) NOT NULL,
    predicted_time_window TEXT NOT NULL,
    factors TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KPLC planned outages table
CREATE TABLE IF NOT EXISTS kplc_planned_outages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    region TEXT NOT NULL,
    specific_area TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    affected_customers INTEGER,
    reason TEXT NOT NULL,
    status TEXT CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
    source_url TEXT NOT NULL,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model feedback table
CREATE TABLE IF NOT EXISTS model_feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE NOT NULL,
    actual_outage_occurred BOOLEAN NOT NULL,
    accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5) NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model versions table
CREATE TABLE IF NOT EXISTS model_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    version TEXT UNIQUE NOT NULL,
    model_file_path TEXT NOT NULL,
    preprocessing_params JSONB NOT NULL,
    training_metrics JSONB NOT NULL,
    performance_metrics JSONB NOT NULL,
    training_data_size INTEGER NOT NULL,
    model_size_mb DECIMAL(8, 2) NOT NULL,
    f1_score DECIMAL(5, 4) CHECK (f1_score >= 0 AND f1_score <= 1) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE
);

-- Training sessions table
CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    model_version_id UUID REFERENCES model_versions(id) ON DELETE CASCADE NOT NULL,
    training_data_size INTEGER NOT NULL,
    training_duration_seconds INTEGER NOT NULL,
    accuracy DECIMAL(5, 4) CHECK (accuracy >= 0 AND accuracy <= 1) NOT NULL,
    loss DECIMAL(10, 6) NOT NULL,
    training_params JSONB NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_outage_reports_location ON outage_reports USING GIST (ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326));
CREATE INDEX IF NOT EXISTS idx_outage_reports_user_id ON outage_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_outage_reports_status ON outage_reports(status);
CREATE INDEX IF NOT EXISTS idx_outage_reports_created_at ON outage_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_weather_data_location ON weather_data USING GIST (ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326));
CREATE INDEX IF NOT EXISTS idx_weather_data_recorded_at ON weather_data(recorded_at);

CREATE INDEX IF NOT EXISTS idx_predictions_location ON predictions USING GIST (ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326));
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);

CREATE INDEX IF NOT EXISTS idx_kplc_outages_region ON kplc_planned_outages(region);
CREATE INDEX IF NOT EXISTS idx_kplc_outages_status ON kplc_planned_outages(status);
CREATE INDEX IF NOT EXISTS idx_kplc_outages_start_time ON kplc_planned_outages(start_time);

CREATE INDEX IF NOT EXISTS idx_model_feedback_user_id ON model_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_model_feedback_prediction_id ON model_feedback(prediction_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_outage_reports_updated_at BEFORE UPDATE ON outage_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE outage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_feedback ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Outage reports are public for viewing but users can only edit their own
CREATE POLICY "Anyone can view outage reports" ON outage_reports FOR SELECT USING (true);
CREATE POLICY "Users can create outage reports" ON outage_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own outage reports" ON outage_reports FOR UPDATE USING (auth.uid() = user_id);

-- Predictions are private to the user
CREATE POLICY "Users can view own predictions" ON predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create predictions" ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Model feedback is private to the user
CREATE POLICY "Users can view own feedback" ON model_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create feedback" ON model_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Weather data and KPLC outages are public
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE kplc_planned_outages ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view weather data" ON weather_data FOR SELECT USING (true);
CREATE POLICY "Anyone can view KPLC outages" ON kplc_planned_outages FOR SELECT USING (true);
CREATE POLICY "Anyone can view model versions" ON model_versions FOR SELECT USING (true);
CREATE POLICY "Anyone can view training sessions" ON training_sessions FOR SELECT USING (true);

-- Insert functions for better data validation
CREATE OR REPLACE FUNCTION insert_outage_report(
    p_user_id UUID,
    p_location_lat DECIMAL(10, 8),
    p_location_lng DECIMAL(11, 8),
    p_location_address TEXT,
    p_outage_type TEXT,
    p_severity TEXT,
    p_description TEXT,
    p_affected_customers INTEGER DEFAULT NULL,
    p_estimated_duration TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_report_id UUID;
BEGIN
    INSERT INTO outage_reports (
        user_id, location_lat, location_lng, location_address,
        outage_type, severity, description, affected_customers, estimated_duration
    ) VALUES (
        p_user_id, p_location_lat, p_location_lng, p_location_address,
        p_outage_type, p_severity, p_description, p_affected_customers, p_estimated_duration
    ) RETURNING id INTO v_report_id;
    
    RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get nearby outage reports
CREATE OR REPLACE FUNCTION get_nearby_outages(
    p_lat DECIMAL(10, 8),
    p_lng DECIMAL(11, 8),
    p_radius_km DECIMAL(10, 2) DEFAULT 10.0
)
RETURNS TABLE (
    id UUID,
    location_address TEXT,
    outage_type TEXT,
    severity TEXT,
    description TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    distance_km DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.location_address,
        o.outage_type,
        o.severity,
        o.description,
        o.status,
        o.created_at,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(o.location_lng, o.location_lat), 4326)::geography
        ) / 1000.0 AS distance_km
    FROM outage_reports o
    WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(o.location_lng, o.location_lat), 4326)::geography,
        p_radius_km * 1000.0
    )
    AND o.status = 'active'
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get weather data for a location
CREATE OR REPLACE FUNCTION get_weather_history(
    p_lat DECIMAL(10, 8),
    p_lng DECIMAL(11, 8),
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    temperature DECIMAL(5, 2),
    humidity INTEGER,
    wind_speed DECIMAL(6, 2),
    weather_condition TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.temperature,
        w.humidity,
        w.wind_speed,
        w.weather_condition,
        w.recorded_at
    FROM weather_data w
    WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(w.location_lng, w.location_lat), 4326)::geography,
        5000.0  -- 5km radius
    )
    AND w.recorded_at >= NOW() - INTERVAL '1 hour' * p_hours
    ORDER BY w.recorded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample data for testing
INSERT INTO model_versions (version, model_file_path, preprocessing_params, training_metrics, performance_metrics, training_data_size, model_size_mb, f1_score, is_active) VALUES
('1.0.0', '/models/model_v1.0.0', 
 '{"scaler_type": "StandardScaler", "feature_names": ["temperature", "humidity", "wind_speed"]}',
 '{"accuracy": 0.85, "precision": 0.82, "recall": 0.88}',
 '{"avg_prediction_time_ms": 45, "memory_usage_mb": 12.5, "cpu_usage_percent": 8.2}',
 50000, 15.2, 0.85, true
) ON CONFLICT (version) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;


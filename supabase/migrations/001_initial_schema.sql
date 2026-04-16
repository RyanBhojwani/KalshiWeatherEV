-- Kalshi Temperature +EV Finder — Initial Schema
-- Run this in the Supabase SQL Editor to set up all tables

-- =============================================================================
-- CITIES — Static configuration mapping Kalshi tickers to weather API coords
-- =============================================================================
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  kalshi_series_ticker TEXT UNIQUE NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  nws_office TEXT,
  nws_grid_x INTEGER,
  nws_grid_y INTEGER,
  forecast_sigma_day1 DOUBLE PRECISION NOT NULL DEFAULT 3.0,
  forecast_sigma_day2 DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  forecast_sigma_day3 DOUBLE PRECISION NOT NULL DEFAULT 6.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- MARKET_SNAPSHOTS — Latest Kalshi bracket data, upserted each poll cycle
-- =============================================================================
CREATE TABLE market_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  event_ticker TEXT NOT NULL,
  market_ticker TEXT UNIQUE NOT NULL,
  event_date DATE NOT NULL,
  yes_sub_title TEXT NOT NULL,
  floor_strike DOUBLE PRECISION,
  cap_strike DOUBLE PRECISION,
  strike_type TEXT NOT NULL,
  yes_bid DOUBLE PRECISION NOT NULL,
  yes_ask DOUBLE PRECISION NOT NULL,
  no_bid DOUBLE PRECISION NOT NULL,
  no_ask DOUBLE PRECISION NOT NULL,
  last_price DOUBLE PRECISION,
  volume TEXT,
  open_interest TEXT,
  close_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_snapshots_city_date ON market_snapshots(city_id, event_date);
CREATE INDEX idx_market_snapshots_event ON market_snapshots(event_ticker);

-- =============================================================================
-- WEATHER_FORECASTS — Latest weather API forecasts per city/date/source
-- =============================================================================
CREATE TABLE weather_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  source TEXT NOT NULL,
  high_temp_f DOUBLE PRECISION NOT NULL,
  low_temp_f DOUBLE PRECISION,
  raw_response JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(city_id, forecast_date, source)
);

CREATE INDEX idx_weather_forecasts_city_date ON weather_forecasts(city_id, forecast_date);

-- =============================================================================
-- EV_CALCULATIONS — Computed EV per bracket (primary table for frontend)
-- =============================================================================
CREATE TABLE ev_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  market_ticker TEXT UNIQUE NOT NULL,
  event_ticker TEXT NOT NULL,
  event_date DATE NOT NULL,

  -- Bracket info (denormalized for fast reads)
  bracket_label TEXT NOT NULL,
  floor_strike DOUBLE PRECISION,
  cap_strike DOUBLE PRECISION,

  -- Kalshi implied probabilities
  kalshi_yes_bid DOUBLE PRECISION NOT NULL,
  kalshi_yes_ask DOUBLE PRECISION NOT NULL,
  kalshi_implied_prob DOUBLE PRECISION NOT NULL,

  -- Our weather-derived probability
  weather_prob DOUBLE PRECISION NOT NULL,
  forecast_mean DOUBLE PRECISION NOT NULL,
  forecast_sigma DOUBLE PRECISION NOT NULL,

  -- EV calculations
  ev_yes DOUBLE PRECISION NOT NULL,
  ev_no DOUBLE PRECISION NOT NULL,
  best_edge DOUBLE PRECISION NOT NULL,
  best_side TEXT NOT NULL,
  is_positive_ev BOOLEAN NOT NULL,

  -- Metadata
  weather_source TEXT NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ev_calculations_city_date ON ev_calculations(city_id, event_date);
CREATE INDEX idx_ev_calculations_positive_ev ON ev_calculations(is_positive_ev) WHERE is_positive_ev = true;

-- =============================================================================
-- POLL_LOG — Worker health tracking
-- =============================================================================
CREATE TABLE poll_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  markets_fetched INTEGER DEFAULT 0,
  forecasts_fetched INTEGER DEFAULT 0,
  evs_calculated INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER
);

-- =============================================================================
-- ROW LEVEL SECURITY — Public read, service-role-only write
-- =============================================================================
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cities" ON cities FOR SELECT USING (true);

ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read market_snapshots" ON market_snapshots FOR SELECT USING (true);

ALTER TABLE weather_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read weather_forecasts" ON weather_forecasts FOR SELECT USING (true);

ALTER TABLE ev_calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ev_calculations" ON ev_calculations FOR SELECT USING (true);

ALTER TABLE poll_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read poll_log" ON poll_log FOR SELECT USING (true);

-- =============================================================================
-- REALTIME — Enable realtime on tables the frontend subscribes to
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE ev_calculations;
ALTER PUBLICATION supabase_realtime ADD TABLE market_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_log;

// Supabase row types — matches the database schema

export interface CityRow {
  id: string;
  slug: string;
  display_name: string;
  kalshi_series_ticker: string;
  latitude: number;
  longitude: number;
  nws_office: string | null;
  nws_grid_x: number | null;
  nws_grid_y: number | null;
  forecast_sigma_day1: number;
  forecast_sigma_day2: number;
  forecast_sigma_day3: number;
  is_active: boolean;
  created_at: string;
}

export interface MarketSnapshotRow {
  id: string;
  city_id: string;
  event_ticker: string;
  market_ticker: string;
  event_date: string;
  yes_sub_title: string;
  floor_strike: number | null;
  cap_strike: number | null;
  strike_type: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number | null;
  volume: string | null;
  open_interest: string | null;
  close_time: string;
  status: string;
  fetched_at: string;
}

export interface WeatherForecastRow {
  id: string;
  city_id: string;
  forecast_date: string;
  source: string;
  high_temp_f: number;
  low_temp_f: number | null;
  raw_response: unknown | null;
  fetched_at: string;
}

export interface EVCalculationRow {
  id: string;
  city_id: string;
  market_ticker: string;
  event_ticker: string;
  event_date: string;
  bracket_label: string;
  floor_strike: number | null;
  cap_strike: number | null;
  kalshi_yes_bid: number;
  kalshi_yes_ask: number;
  kalshi_implied_prob: number;
  weather_prob: number;
  forecast_mean: number;
  forecast_sigma: number;
  ev_yes: number;
  ev_no: number;
  best_edge: number;
  best_side: string;
  is_positive_ev: boolean;
  weather_source: string;
  calculated_at: string;
}

export interface PollLogRow {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  markets_fetched: number;
  forecasts_fetched: number;
  evs_calculated: number;
  error_message: string | null;
  duration_ms: number | null;
}

// Joined type for frontend (ev_calculations with city info)
export interface EVWithCity extends EVCalculationRow {
  cities: CityRow;
}

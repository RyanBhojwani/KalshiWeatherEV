-- Seed the cities table with the 6 Kalshi temperature market cities

INSERT INTO cities (slug, display_name, kalshi_series_ticker, latitude, longitude, nws_office, nws_grid_x, nws_grid_y, forecast_sigma_day1, forecast_sigma_day2, forecast_sigma_day3)
VALUES
  ('nyc', 'New York City', 'KXHIGHNY', 40.7128, -74.0060, 'OKX', 33, 37, 3.0, 5.0, 6.0),
  ('chicago', 'Chicago', 'KXHIGHCHI', 41.8781, -87.6298, 'LOT', 65, 76, 3.5, 5.5, 6.5),
  ('la', 'Los Angeles', 'KXHIGHLAX', 34.0522, -118.2437, 'LOX', 154, 44, 2.5, 4.0, 5.0),
  ('miami', 'Miami', 'KXHIGHMIA', 25.7617, -80.1918, 'MFL', 75, 53, 2.0, 3.5, 4.5),
  ('denver', 'Denver', 'KXHIGHDEN', 39.7392, -104.9903, 'BOU', 62, 60, 4.0, 6.0, 7.0),
  ('austin', 'Austin', 'KXHIGHAUS', 30.2672, -97.7431, 'EWX', 116, 92, 3.0, 5.0, 6.0)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  kalshi_series_ticker = EXCLUDED.kalshi_series_ticker,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  nws_office = EXCLUDED.nws_office,
  nws_grid_x = EXCLUDED.nws_grid_x,
  nws_grid_y = EXCLUDED.nws_grid_y,
  forecast_sigma_day1 = EXCLUDED.forecast_sigma_day1,
  forecast_sigma_day2 = EXCLUDED.forecast_sigma_day2,
  forecast_sigma_day3 = EXCLUDED.forecast_sigma_day3;

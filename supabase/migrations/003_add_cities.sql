-- Add the 14 additional Kalshi temperature markets that went live
-- after the initial 6. Uses new-format series tickers (KXHIGHT*).

INSERT INTO cities (slug, display_name, kalshi_series_ticker, latitude, longitude, nws_office, nws_grid_x, nws_grid_y, forecast_sigma_day1, forecast_sigma_day2, forecast_sigma_day3)
VALUES
  ('boston',       'Boston',         'KXHIGHTBOS',  42.3601,  -71.0589, 'BOX',  71, 101, 3.0, 5.0, 6.0),
  ('dc',           'Washington DC',  'KXHIGHTDC',   38.9072,  -77.0369, 'LWX',  96,  72, 3.0, 5.0, 6.0),
  ('neworleans',   'New Orleans',    'KXHIGHTNOLA', 29.9511,  -90.0715, 'LIX',  68,  88, 2.5, 4.0, 5.0),
  ('phoenix',      'Phoenix',        'KXHIGHTPHX',  33.4484, -112.0740, 'PSR', 159,  58, 2.5, 4.0, 5.0),
  ('seattle',      'Seattle',        'KXHIGHTSEA',  47.6062, -122.3321, 'SEW', 125,  68, 2.5, 4.0, 5.0),
  ('houston',      'Houston',        'KXHIGHTHOU',  29.7604,  -95.3698, 'HGX',  63,  95, 2.5, 4.0, 5.0),
  ('sanantonio',   'San Antonio',    'KXHIGHTSATX', 29.4241,  -98.4936, 'EWX', 126,  54, 2.5, 4.0, 5.0),
  ('vegas',        'Las Vegas',      'KXHIGHTLV',   36.1699, -115.1398, 'VEF', 123,  98, 2.5, 4.0, 5.0),
  ('sf',           'San Francisco',  'KXHIGHTSFO',  37.7749, -122.4194, 'MTR',  85, 105, 2.5, 4.0, 5.0),
  ('atlanta',      'Atlanta',        'KXHIGHTATL',  33.7490,  -84.3880, 'FFC',  51,  87, 3.0, 5.0, 6.0),
  ('dallas',       'Dallas',         'KXHIGHTDAL',  32.7767,  -96.7970, 'FWD',  89, 104, 3.0, 5.0, 6.0),
  ('okc',          'Oklahoma City',  'KXHIGHTOKC',  35.4676,  -97.5164, 'OUN',  97,  94, 3.5, 5.5, 6.5),
  ('minneapolis',  'Minneapolis',    'KXHIGHTMIN',  44.9778,  -93.2650, 'MPX', 108,  72, 3.5, 5.5, 6.5),
  ('philadelphia', 'Philadelphia',   'KXHIGHPHIL',  39.9526,  -75.1652, 'PHI',  50,  76, 3.0, 5.0, 6.0)
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

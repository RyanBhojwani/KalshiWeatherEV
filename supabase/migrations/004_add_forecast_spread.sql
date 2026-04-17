-- Track the absolute temperature spread between NWS and Open-Meteo
-- forecasts for the same city/date. Null when only one source was available.
-- Drives sigma inflation in the EV calc and UI transparency.

ALTER TABLE ev_calculations
  ADD COLUMN IF NOT EXISTS forecast_spread_f DOUBLE PRECISION;

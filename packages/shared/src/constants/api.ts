// API configuration constants

export const KALSHI_API_BASE = "https://api.elections.kalshi.com/trade-api/v2";

export const OPEN_METEO_API_BASE = "https://api.open-meteo.com/v1";

export const NWS_API_BASE = "https://api.weather.gov";

export const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Kalshi rate limits (basic tier)
export const KALSHI_READ_RATE_LIMIT = 20; // per second
export const KALSHI_DELAY_BETWEEN_REQUESTS_MS = 500; // safety margin between city fetches

// Open-Meteo API response types
export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  daily: {
    time: string[]; // ["2026-04-16", "2026-04-17", ...]
    temperature_2m_max: number[]; // in Fahrenheit
    temperature_2m_min: number[]; // in Fahrenheit
  };
  daily_units: {
    time: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
  };
}

// NWS API response types
export interface NWSForecastResponse {
  properties: {
    periods: NWSForecastPeriod[];
    generatedAt: string;
    updateTime: string;
  };
}

export interface NWSForecastPeriod {
  number: number;
  name: string; // "Today", "Tonight", "Thursday", etc.
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: "F" | "C";
  temperatureTrend: string | null;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  detailedForecast: string;
}

// Unified forecast result
export interface CityForecast {
  citySlug: string;
  forecastDate: string; // YYYY-MM-DD
  source: string;
  highTempF: number;
  lowTempF: number | null;
  fetchedAt: string; // ISO datetime
  rawResponse?: unknown;
  // Absolute |NWS - OpenMeteo| high temp spread. Only set on ensemble rows.
  sourceSpreadF?: number;
}

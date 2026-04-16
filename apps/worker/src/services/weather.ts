import {
  OPEN_METEO_API_BASE,
  NWS_API_BASE,
  CITIES,
  type OpenMeteoResponse,
  type NWSForecastResponse,
  type CityForecast,
  type CityConfig,
} from "@kalshi-ev/shared";

/**
 * Fetch daily high/low forecasts from Open-Meteo for all cities in a single batched call.
 * Open-Meteo supports comma-separated coordinates, making this very efficient.
 */
export async function fetchOpenMeteoForecasts(): Promise<CityForecast[]> {
  const latitudes = CITIES.map((c) => c.latitude).join(",");
  const longitudes = CITIES.map((c) => c.longitude).join(",");

  const url = new URL(`${OPEN_METEO_API_BASE}/forecast`);
  url.searchParams.set("latitude", latitudes);
  url.searchParams.set("longitude", longitudes);
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo API error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const now = new Date().toISOString();
  const forecasts: CityForecast[] = [];

  // When multiple locations are requested, Open-Meteo returns an array
  const results: OpenMeteoResponse[] = Array.isArray(data) ? data : [data];

  for (let i = 0; i < results.length && i < CITIES.length; i++) {
    const result = results[i];
    const city = CITIES[i];

    if (!result.daily?.time) continue;

    for (let j = 0; j < result.daily.time.length; j++) {
      forecasts.push({
        citySlug: city.slug,
        forecastDate: result.daily.time[j],
        source: "open_meteo",
        highTempF: result.daily.temperature_2m_max[j],
        lowTempF: result.daily.temperature_2m_min[j],
        fetchedAt: now,
        rawResponse: result,
      });
    }
  }

  return forecasts;
}

/**
 * Fetch NWS forecast for a single city.
 * Uses the pre-computed grid coordinates to avoid the /points lookup.
 * NWS is the settlement source for Kalshi, so this is valuable as validation.
 */
async function fetchNWSForecastForCity(
  city: CityConfig
): Promise<CityForecast[]> {
  if (!city.nwsOffice || !city.nwsGridX || !city.nwsGridY) {
    return [];
  }

  const url = `${NWS_API_BASE}/gridpoints/${city.nwsOffice}/${city.nwsGridX},${city.nwsGridY}/forecast`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": "KalshiTempEV/1.0 (github.com/kalshi-weather-ev)",
    },
  });

  if (!response.ok) {
    throw new Error(`NWS API error ${response.status} for ${city.slug}: ${await response.text()}`);
  }

  const data = (await response.json()) as NWSForecastResponse;
  const periods = data.properties?.periods || [];
  const now = new Date().toISOString();
  const forecasts: CityForecast[] = [];

  // NWS returns daytime/nighttime periods; we want daytime highs
  for (const period of periods) {
    if (!period.isDaytime) continue;

    // Extract date from startTime
    const forecastDate = period.startTime.split("T")[0];

    forecasts.push({
      citySlug: city.slug,
      forecastDate,
      source: "nws",
      highTempF: period.temperature,
      lowTempF: null, // NWS daytime periods don't have low
      fetchedAt: now,
    });
  }

  return forecasts;
}

/**
 * Fetch NWS forecasts for all cities.
 * Each city is fetched independently to avoid one failure blocking others.
 */
export async function fetchNWSForecasts(): Promise<CityForecast[]> {
  const allForecasts: CityForecast[] = [];

  for (const city of CITIES) {
    try {
      const forecasts = await fetchNWSForecastForCity(city);
      allForecasts.push(...forecasts);
    } catch (error) {
      console.warn(`NWS forecast failed for ${city.displayName}:`, error);
      // NWS is secondary — continue on failure
    }
  }

  return allForecasts;
}

/**
 * Fetch all weather forecasts from both sources.
 * Open-Meteo is primary, NWS is secondary.
 */
export async function fetchAllForecasts(): Promise<CityForecast[]> {
  const [openMeteo, nws] = await Promise.allSettled([
    fetchOpenMeteoForecasts(),
    fetchNWSForecasts(),
  ]);

  const forecasts: CityForecast[] = [];

  if (openMeteo.status === "fulfilled") {
    forecasts.push(...openMeteo.value);
  } else {
    console.error("Open-Meteo fetch failed:", openMeteo.reason);
  }

  if (nws.status === "fulfilled") {
    forecasts.push(...nws.value);
  } else {
    console.warn("NWS fetch failed (secondary source):", nws.reason);
  }

  return forecasts;
}

/**
 * Convert CityForecast into a weather_forecasts row for Supabase upsert.
 */
export function forecastToRow(
  forecast: CityForecast,
  cityId: string
): {
  city_id: string;
  forecast_date: string;
  source: string;
  high_temp_f: number;
  low_temp_f: number | null;
  raw_response: unknown | null;
  fetched_at: string;
} {
  return {
    city_id: cityId,
    forecast_date: forecast.forecastDate,
    source: forecast.source,
    high_temp_f: forecast.highTempF,
    low_temp_f: forecast.lowTempF,
    raw_response: forecast.rawResponse || null,
    fetched_at: forecast.fetchedAt,
  };
}

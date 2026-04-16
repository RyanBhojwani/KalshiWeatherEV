import {
  bracketProbability,
  calculateBracketEV,
  selectSigma,
  getCityBySlug,
  type TemperatureEvent,
  type CityForecast,
  type BracketEV,
  type CityConfig,
} from "@kalshi-ev/shared";

/**
 * Calculate the number of days between today and the event date.
 * Used to select the appropriate sigma value.
 */
function daysAhead(eventDate: string, timezone: string): number {
  const now = new Date();
  const event = new Date(eventDate + "T12:00:00");

  // Simple day difference calculation
  const diffMs = event.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Find the best Open-Meteo forecast for a given city and date.
 * Prefers Open-Meteo over NWS as the primary source.
 */
function findForecast(
  forecasts: CityForecast[],
  citySlug: string,
  eventDate: string
): CityForecast | undefined {
  // Prefer Open-Meteo (primary)
  const openMeteo = forecasts.find(
    (f) =>
      f.citySlug === citySlug &&
      f.forecastDate === eventDate &&
      f.source === "open_meteo"
  );
  if (openMeteo) return openMeteo;

  // Fallback to NWS
  return forecasts.find(
    (f) =>
      f.citySlug === citySlug &&
      f.forecastDate === eventDate &&
      f.source === "nws"
  );
}

/**
 * Calculate EV for all brackets in a single temperature event.
 *
 * This is the core pipeline:
 * 1. Look up the city config for sigma values
 * 2. Find the weather forecast for this event date
 * 3. Determine days-ahead to select appropriate sigma
 * 4. For each bracket: compute our probability, then EV
 */
export function calculateEventEV(
  event: TemperatureEvent,
  forecasts: CityForecast[]
): BracketEV[] {
  const city = getCityBySlug(event.citySlug);
  if (!city) {
    console.warn(`No city config for slug: ${event.citySlug}`);
    return [];
  }

  const forecast = findForecast(forecasts, event.citySlug, event.eventDate);
  if (!forecast) {
    console.warn(
      `No forecast for ${event.citySlug} on ${event.eventDate}, skipping`
    );
    return [];
  }

  const days = daysAhead(event.eventDate, city.timezone);
  const sigma = selectSigma(city.sigmaDays, days);
  const mean = forecast.highTempF;

  const results: BracketEV[] = [];

  for (const bracket of event.brackets) {
    // Skip brackets with no liquidity (both bid and ask at 0)
    if (bracket.yesBid === 0 && bracket.yesAsk === 0) continue;

    // Calculate our probability for this bracket
    const weatherProb = bracketProbability(
      bracket.floorStrike,
      bracket.capStrike,
      bracket.strikeType,
      mean,
      sigma
    );

    // Calculate EV
    const ev = calculateBracketEV(
      weatherProb,
      bracket.yesBid,
      bracket.yesAsk
    );

    results.push({
      marketTicker: bracket.marketTicker,
      eventTicker: event.eventTicker,
      bracketLabel: bracket.label,
      floorStrike: bracket.floorStrike,
      capStrike: bracket.capStrike,
      kalshiYesBid: bracket.yesBid,
      kalshiYesAsk: bracket.yesAsk,
      kalshiImpliedProb: bracket.impliedProb,
      weatherProb,
      forecastMean: mean,
      forecastSigma: sigma,
      evYes: ev.evYes,
      evNo: ev.evNo,
      bestEdge: ev.bestEdge,
      bestSide: ev.bestSide,
      isPositiveEV: ev.isPositiveEV,
      weatherSource: forecast.source,
    });
  }

  return results;
}

/**
 * Calculate EV for all events across all cities.
 * Returns a flat array of BracketEV results.
 */
export function calculateAllEVs(
  events: TemperatureEvent[],
  forecasts: CityForecast[]
): BracketEV[] {
  const allResults: BracketEV[] = [];

  for (const event of events) {
    try {
      const results = calculateEventEV(event, forecasts);
      allResults.push(...results);
    } catch (error) {
      console.error(
        `EV calculation failed for ${event.eventTicker}:`,
        error
      );
    }
  }

  // Sanity check: log summary
  const positiveEV = allResults.filter((r) => r.isPositiveEV);
  console.log(
    `EV calculated: ${allResults.length} brackets, ${positiveEV.length} +EV opportunities`
  );

  return allResults;
}

/**
 * Convert BracketEV into an ev_calculations row for Supabase upsert.
 */
export function evToRow(
  ev: BracketEV,
  cityId: string,
  eventDate: string
): {
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
} {
  return {
    city_id: cityId,
    market_ticker: ev.marketTicker,
    event_ticker: ev.eventTicker,
    event_date: eventDate,
    bracket_label: ev.bracketLabel,
    floor_strike: ev.floorStrike,
    cap_strike: ev.capStrike,
    kalshi_yes_bid: ev.kalshiYesBid,
    kalshi_yes_ask: ev.kalshiYesAsk,
    kalshi_implied_prob: ev.kalshiImpliedProb,
    weather_prob: ev.weatherProb,
    forecast_mean: ev.forecastMean,
    forecast_sigma: ev.forecastSigma,
    ev_yes: ev.evYes,
    ev_no: ev.evNo,
    best_edge: ev.bestEdge,
    best_side: ev.bestSide,
    is_positive_ev: ev.isPositiveEV,
    weather_source: ev.weatherSource,
    calculated_at: new Date().toISOString(),
  };
}

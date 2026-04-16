import { POLL_INTERVAL_MS } from "@kalshi-ev/shared";
import { fetchAllCityEvents, eventToSnapshotRows } from "./services/kalshi";
import { fetchAllForecasts, forecastToRow } from "./services/weather";
import { calculateAllEVs, evToRow } from "./services/ev-engine";
import {
  getCities,
  cityIdLookup,
  upsertMarketSnapshots,
  upsertWeatherForecasts,
  upsertEVCalculations,
  logPollStart,
  logPollComplete,
} from "./services/supabase";

const pollInterval = parseInt(process.env.POLL_INTERVAL_MS || "") || POLL_INTERVAL_MS;

/**
 * Single poll cycle: fetch data, calculate EV, write to Supabase.
 */
async function pollCycle(): Promise<void> {
  const startTime = Date.now();
  const pollId = await logPollStart();

  console.log(`[${new Date().toISOString()}] Poll cycle starting...`);

  try {
    // 1. Fetch cities from Supabase for ID lookups
    const cities = await getCities();
    const idLookup = cityIdLookup(cities);
    console.log(`  Loaded ${cities.size} active cities`);

    // 2. Fetch Kalshi events with nested markets for all cities
    const events = await fetchAllCityEvents();
    console.log(
      `  Fetched ${events.length} Kalshi events with ${events.reduce((n, e) => n + e.brackets.length, 0)} brackets`
    );

    // 3. Fetch weather forecasts from Open-Meteo + NWS
    const forecasts = await fetchAllForecasts();
    console.log(`  Fetched ${forecasts.length} weather forecasts`);

    // 4. Calculate EV for all brackets
    const evResults = calculateAllEVs(events, forecasts);

    // 5. Prepare rows for Supabase upsert
    const snapshotRows = events.flatMap((event) => {
      const cityId = idLookup.get(event.citySlug);
      if (!cityId) return [];
      return eventToSnapshotRows(event, cityId);
    });

    const forecastRows = forecasts
      .filter((f) => idLookup.has(f.citySlug))
      .map((f) => forecastToRow(f, idLookup.get(f.citySlug)!));

    const evRows = evResults.map((ev) => {
      // Find the event to get the city slug and date
      const event = events.find((e) => e.eventTicker === ev.eventTicker);
      const cityId = event ? idLookup.get(event.citySlug) : undefined;
      return evToRow(ev, cityId || "", event?.eventDate || "");
    }).filter((row) => row.city_id !== "");

    // 6. Upsert to Supabase
    const marketCount = await upsertMarketSnapshots(snapshotRows);
    const forecastCount = await upsertWeatherForecasts(forecastRows);
    const evCount = await upsertEVCalculations(evRows);

    const durationMs = Date.now() - startTime;
    console.log(
      `  Upserted: ${marketCount} markets, ${forecastCount} forecasts, ${evCount} EVs`
    );
    console.log(`  Poll cycle completed in ${durationMs}ms`);

    await logPollComplete(pollId, {
      success: true,
      marketsFetched: marketCount,
      forecastsFetched: forecastCount,
      evsCalculated: evCount,
      durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`  Poll cycle failed after ${durationMs}ms:`, error);

    await logPollComplete(pollId, {
      success: false,
      error,
      durationMs,
    });
  }
}

// Startup
console.log("=== Kalshi Temperature EV Worker ===");
console.log(`Poll interval: ${pollInterval / 1000}s`);
console.log(`Starting at: ${new Date().toISOString()}`);

// Run immediately, then on interval
pollCycle().then(() => {
  setInterval(pollCycle, pollInterval);
});

// Graceful error handling — log before Railway auto-restarts
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

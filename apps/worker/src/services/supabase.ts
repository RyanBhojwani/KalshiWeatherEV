import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { CityRow } from "@kalshi-ev/shared";

let supabase: SupabaseClient;

/**
 * Get the Supabase client (singleton).
 * Uses service role key for write access (bypasses RLS).
 */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
      );
    }

    supabase = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  return supabase;
}

/**
 * Fetch all active cities from the database.
 * Returns a Map of slug -> CityRow for quick lookups.
 */
export async function getCities(): Promise<Map<string, CityRow>> {
  const { data, error } = await getSupabase()
    .from("cities")
    .select("*")
    .eq("is_active", true);

  if (error) throw new Error(`Failed to fetch cities: ${error.message}`);

  const map = new Map<string, CityRow>();
  for (const city of data || []) {
    map.set(city.slug, city);
  }
  return map;
}

/**
 * Create a city slug -> city ID lookup from the cities Map.
 */
export function cityIdLookup(cities: Map<string, CityRow>): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [slug, city] of cities) {
    lookup.set(slug, city.id);
  }
  return lookup;
}

/**
 * Upsert market snapshots (conflict on market_ticker).
 */
export async function upsertMarketSnapshots(
  rows: Array<Record<string, unknown>>
): Promise<number> {
  if (rows.length === 0) return 0;

  const { error } = await getSupabase()
    .from("market_snapshots")
    .upsert(rows, { onConflict: "market_ticker" });

  if (error) {
    console.error("Failed to upsert market snapshots:", error.message);
    throw error;
  }

  return rows.length;
}

/**
 * Upsert weather forecasts (conflict on city_id + forecast_date + source).
 */
export async function upsertWeatherForecasts(
  rows: Array<Record<string, unknown>>
): Promise<number> {
  if (rows.length === 0) return 0;

  const { error } = await getSupabase()
    .from("weather_forecasts")
    .upsert(rows, { onConflict: "city_id,forecast_date,source" });

  if (error) {
    console.error("Failed to upsert weather forecasts:", error.message);
    throw error;
  }

  return rows.length;
}

/**
 * Upsert EV calculations (conflict on market_ticker).
 */
export async function upsertEVCalculations(
  rows: Array<Record<string, unknown>>
): Promise<number> {
  if (rows.length === 0) return 0;

  const { error } = await getSupabase()
    .from("ev_calculations")
    .upsert(rows, { onConflict: "market_ticker" });

  if (error) {
    console.error("Failed to upsert EV calculations:", error.message);
    throw error;
  }

  return rows.length;
}

/**
 * Log the start of a poll cycle.
 */
export async function logPollStart(): Promise<string> {
  const { data, error } = await getSupabase()
    .from("poll_log")
    .insert({ status: "running" })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to log poll start:", error.message);
    return "unknown";
  }

  return data.id;
}

/**
 * Log the completion of a poll cycle.
 */
export async function logPollComplete(
  pollId: string,
  result: {
    success: boolean;
    marketsFetched?: number;
    forecastsFetched?: number;
    evsCalculated?: number;
    error?: unknown;
    durationMs?: number;
  }
): Promise<void> {
  if (pollId === "unknown") return;

  const { error } = await getSupabase()
    .from("poll_log")
    .update({
      completed_at: new Date().toISOString(),
      status: result.success ? "success" : "error",
      markets_fetched: result.marketsFetched || 0,
      forecasts_fetched: result.forecastsFetched || 0,
      evs_calculated: result.evsCalculated || 0,
      error_message: result.error
        ? String(result.error instanceof Error ? result.error.message : result.error)
        : null,
      duration_ms: result.durationMs || null,
    })
    .eq("id", pollId);

  if (error) {
    console.error("Failed to log poll completion:", error.message);
  }
}

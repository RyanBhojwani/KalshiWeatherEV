"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useRealtimeEV, type EVWithCity } from "@/hooks/useRealtimeEV";
import { getTargetDateET, isTradable } from "@/lib/targetDate";
import { EVBadge } from "./EVBadge";
import { StatusIndicator } from "./StatusIndicator";

interface CityGrouped {
  citySlug: string;
  cityName: string;
  eventDate: string;
  forecastMean: number;
  forecastSigma: number;
  forecastSpread: number | null;
  kalshiImpliedHigh: number | null;
  bestBracket: EVWithCity | null;
  totalBrackets: number;
  positiveEVCount: number;
}

/**
 * Approximate the market-implied expected high from Kalshi bracket prices.
 *
 * For "between" brackets we use the midpoint. For tail markets with only a
 * floor_strike ("X or above") or only a cap_strike ("X or below") we step
 * one degree past the strike as an approximation — the real tail mass may
 * be further out, but this is close enough for at-a-glance comparison.
 *
 * Returns null if weights don't sum to a sensible total (avoids misleading
 * values when brackets are missing or dead).
 */
function computeKalshiImpliedHigh(
  brackets: { floor_strike: number | null; cap_strike: number | null; kalshi_implied_prob: number }[]
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const b of brackets) {
    let midpoint: number | null = null;
    if (b.floor_strike !== null && b.cap_strike !== null) {
      midpoint = (b.floor_strike + b.cap_strike) / 2;
    } else if (b.cap_strike !== null) {
      midpoint = b.cap_strike - 1; // "X or below"
    } else if (b.floor_strike !== null) {
      midpoint = b.floor_strike + 1; // "X or above"
    }
    if (midpoint === null) continue;
    weightedSum += midpoint * b.kalshi_implied_prob;
    totalWeight += b.kalshi_implied_prob;
  }
  if (totalWeight < 0.5) return null;
  return weightedSum / totalWeight;
}

function groupByCity(data: EVWithCity[], targetDate: string): CityGrouped[] {
  const groups = new Map<string, EVWithCity[]>();

  for (const row of data) {
    if (row.event_date !== targetDate) continue;
    const key = row.cities?.slug || "unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const result: CityGrouped[] = [];

  for (const [slug, rows] of groups) {
    const tradable = rows.filter(isTradable);
    if (tradable.length === 0) continue;

    const positiveEV = tradable.filter((r) => r.is_positive_ev);
    const best = positiveEV.length > 0
      ? positiveEV.reduce((a, b) => (a.best_edge > b.best_edge ? a : b))
      : null;

    const representative = tradable[0];
    // Implied high is computed from ALL rows for the event (not just tradable
    // ones), since tail brackets outside the 10-90% band are still needed to
    // anchor the distribution.
    const allBrackets = rows;
    const kalshiImpliedHigh = computeKalshiImpliedHigh(allBrackets);

    result.push({
      citySlug: slug,
      cityName: representative.cities?.display_name || slug,
      eventDate: representative.event_date,
      forecastMean: representative.forecast_mean,
      forecastSigma: representative.forecast_sigma,
      forecastSpread: representative.forecast_spread_f ?? null,
      kalshiImpliedHigh,
      bestBracket: best,
      totalBrackets: tradable.length,
      positiveEVCount: positiveEV.length,
    });
  }

  result.sort((a, b) => {
    const aEdge = a.bestBracket?.best_edge ?? -1;
    const bEdge = b.bestBracket?.best_edge ?? -1;
    return bEdge - aEdge;
  });

  return result;
}

export function CityOverviewTable() {
  const router = useRouter();
  const { data, loading, error } = useRealtimeEV();
  const targetDate = useMemo(() => getTargetDateET(), []);
  const cities = useMemo(() => groupByCity(data, targetDate), [data, targetDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-foreground/50">Loading market data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Error loading data: {error}
      </div>
    );
  }

  const targetDateLabel = new Date(targetDate + "T12:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric" }
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Temperature Markets</h2>
          <p className="text-xs text-foreground/50">
            Tradable brackets for {targetDateLabel} · Kalshi price 10–90%, spread &lt; 8¢
          </p>
        </div>
        <StatusIndicator />
      </div>

      {cities.length === 0 ? (
        <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-8 text-center">
          <p className="text-foreground/60">
            {data.length === 0
              ? "No market data available yet."
              : `No tradable markets for ${targetDateLabel} right now.`}
          </p>
          <p className="mt-1 text-sm text-foreground/40">
            {data.length === 0
              ? "The background worker needs to run at least once to populate data."
              : "Try clicking into a specific city to see future days."}
          </p>
        </div>
      ) : (
      <div className="overflow-x-auto rounded-lg border border-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/5">
              <th className="px-4 py-3 text-left font-medium">City</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Forecast High</th>
              <th className="px-4 py-3 text-right font-medium">Kalshi Implied</th>
              <th className="px-4 py-3 text-left font-medium">Best Kalshi Bracket</th>
              <th className="px-4 py-3 text-right font-medium">Kalshi %</th>
              <th className="px-4 py-3 text-right font-medium">Our %</th>
              <th className="px-4 py-3 text-right font-medium">Best +EV</th>
              <th className="px-4 py-3 text-right font-medium">Brackets</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city) => (
              <tr
                key={city.citySlug}
                onClick={() => router.push(`/city/${city.citySlug}`)}
                className="border-b border-foreground/5 transition-colors hover:bg-foreground/5 cursor-pointer"
              >
                  <td className="px-4 py-3 font-medium">{city.cityName}</td>
                  <td className="px-4 py-3 text-foreground/60">
                    {new Date(city.eventDate + "T12:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {city.forecastMean.toFixed(0)}°F
                    <span className="ml-1 text-foreground/40">
                      ±{city.forecastSigma.toFixed(0)}
                    </span>
                    {city.forecastSpread !== null && city.forecastSpread >= 3 && (
                      <span
                        className="ml-1 text-amber-600"
                        title={`NWS vs Open-Meteo differ by ${city.forecastSpread.toFixed(1)}°F`}
                      >
                        Δ{city.forecastSpread.toFixed(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground/70">
                    {city.kalshiImpliedHigh !== null
                      ? `${city.kalshiImpliedHigh.toFixed(0)}°F`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {city.bestBracket?.bracket_label || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {city.bestBracket
                      ? `${(city.bestBracket.kalshi_implied_prob * 100).toFixed(0)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {city.bestBracket
                      ? `${(city.bestBracket.weather_prob * 100).toFixed(0)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {city.bestBracket ? (
                      <EVBadge
                        edge={city.bestBracket.best_edge}
                        side={city.bestBracket.best_side}
                      />
                    ) : (
                      <span className="text-foreground/40">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground/60">
                    {city.positiveEVCount}/{city.totalBrackets}
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

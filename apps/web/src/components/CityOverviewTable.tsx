"use client";

import Link from "next/link";
import { useRealtimeEV, type EVWithCity } from "@/hooks/useRealtimeEV";
import { EVBadge } from "./EVBadge";
import { StatusIndicator } from "./StatusIndicator";

interface CityGrouped {
  citySlug: string;
  cityName: string;
  eventDate: string;
  forecastMean: number;
  forecastSigma: number;
  bestBracket: EVWithCity | null;
  totalBrackets: number;
  positiveEVCount: number;
}

function groupByCity(data: EVWithCity[]): CityGrouped[] {
  const groups = new Map<string, EVWithCity[]>();

  for (const row of data) {
    const key = row.cities?.slug || "unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const result: CityGrouped[] = [];

  for (const [slug, rows] of groups) {
    // Find the best +EV bracket for this city
    const positiveEV = rows.filter((r) => r.is_positive_ev);
    const best = positiveEV.length > 0
      ? positiveEV.reduce((a, b) => (a.best_edge > b.best_edge ? a : b))
      : null;

    // Use the first row's event date and forecast for display
    const representative = rows[0];

    result.push({
      citySlug: slug,
      cityName: representative.cities?.display_name || slug,
      eventDate: representative.event_date,
      forecastMean: representative.forecast_mean,
      forecastSigma: representative.forecast_sigma,
      bestBracket: best,
      totalBrackets: rows.length,
      positiveEVCount: positiveEV.length,
    });
  }

  // Sort by best edge descending
  result.sort((a, b) => {
    const aEdge = a.bestBracket?.best_edge ?? -1;
    const bEdge = b.bestBracket?.best_edge ?? -1;
    return bEdge - aEdge;
  });

  return result;
}

export function CityOverviewTable() {
  const { data, loading, error } = useRealtimeEV();

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

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-8 text-center">
        <p className="text-foreground/60">No market data available yet.</p>
        <p className="mt-1 text-sm text-foreground/40">
          The background worker needs to run at least once to populate data.
        </p>
      </div>
    );
  }

  const cities = groupByCity(data);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Temperature Markets</h2>
        <StatusIndicator />
      </div>

      <div className="overflow-x-auto rounded-lg border border-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/5">
              <th className="px-4 py-3 text-left font-medium">City</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Forecast High</th>
              <th className="px-4 py-3 text-left font-medium">Best Kalshi Bracket</th>
              <th className="px-4 py-3 text-right font-medium">Kalshi %</th>
              <th className="px-4 py-3 text-right font-medium">Our %</th>
              <th className="px-4 py-3 text-right font-medium">Best +EV</th>
              <th className="px-4 py-3 text-right font-medium">Brackets</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city) => (
              <Link
                key={city.citySlug}
                href={`/city/${city.citySlug}`}
                className="contents"
              >
                <tr className="border-b border-foreground/5 transition-colors hover:bg-foreground/5 cursor-pointer">
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
              </Link>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

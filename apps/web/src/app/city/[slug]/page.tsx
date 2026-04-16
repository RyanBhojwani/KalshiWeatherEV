"use client";

import { use } from "react";
import Link from "next/link";
import { useRealtimeCityData } from "@/hooks/useRealtimeCityData";
import { ProbabilityChart } from "@/components/ProbabilityChart";
import { BracketTable } from "@/components/BracketTable";
import type { EVCalculationRow } from "@kalshi-ev/shared";

// Group EV calculations by event date
function groupByDate(evs: EVCalculationRow[]): Map<string, EVCalculationRow[]> {
  const groups = new Map<string, EVCalculationRow[]>();
  for (const ev of evs) {
    const date = ev.event_date;
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(ev);
  }
  return groups;
}

export default function CityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { city, evCalculations, loading, error } = useRealtimeCityData(slug);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-foreground/50">Loading city data...</div>
      </div>
    );
  }

  if (error || !city) {
    return (
      <div className="space-y-4">
        <Link href="/" className="text-sm text-foreground/50 hover:text-foreground">
          &larr; Back to dashboard
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error || "City not found"}
        </div>
      </div>
    );
  }

  const dateGroups = groupByDate(evCalculations);
  const positiveEVCount = evCalculations.filter((ev) => ev.is_positive_ev).length;

  // Get representative forecast data (from first EV row)
  const firstEV = evCalculations[0];
  const forecastMean = firstEV?.forecast_mean ?? 0;
  const forecastSigma = firstEV?.forecast_sigma ?? 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/" className="text-sm text-foreground/50 hover:text-foreground">
          &larr; Back to dashboard
        </Link>
        <div className="mt-2 flex items-baseline gap-4">
          <h2 className="text-2xl font-bold">{city.display_name}</h2>
          <span className="text-sm text-foreground/40">
            {city.kalshi_series_ticker}
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
          <div className="text-xs font-medium uppercase text-foreground/40">
            Forecast High
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {forecastMean.toFixed(0)}°F
          </div>
          <div className="text-xs text-foreground/40">
            ± {forecastSigma.toFixed(1)}°F
          </div>
        </div>
        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
          <div className="text-xs font-medium uppercase text-foreground/40">
            Total Brackets
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {evCalculations.length}
          </div>
        </div>
        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
          <div className="text-xs font-medium uppercase text-foreground/40">
            +EV Opportunities
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-green-600">
            {positiveEVCount}
          </div>
        </div>
        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
          <div className="text-xs font-medium uppercase text-foreground/40">
            Event Dates
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {dateGroups.size}
          </div>
        </div>
      </div>

      {/* Per-date sections */}
      {Array.from(dateGroups.entries()).map(([date, brackets]) => {
        const dateMean = brackets[0]?.forecast_mean ?? forecastMean;
        const dateSigma = brackets[0]?.forecast_sigma ?? forecastSigma;

        return (
          <div key={date} className="space-y-4">
            <h3 className="text-lg font-semibold">
              {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>

            {/* Distribution Chart */}
            <ProbabilityChart
              brackets={brackets}
              forecastMean={dateMean}
              forecastSigma={dateSigma}
            />

            {/* Bracket Table */}
            <BracketTable brackets={brackets} />
          </div>
        );
      })}

      {evCalculations.length === 0 && (
        <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-8 text-center">
          <p className="text-foreground/60">No market data for this city yet.</p>
          <p className="mt-1 text-sm text-foreground/40">
            The background worker needs to run to populate data.
          </p>
        </div>
      )}
    </div>
  );
}

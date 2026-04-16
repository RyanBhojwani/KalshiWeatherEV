"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { EVCalculationRow } from "@kalshi-ev/shared";

interface ProbabilityChartProps {
  brackets: EVCalculationRow[];
  forecastMean: number;
  forecastSigma: number;
}

interface ChartDataPoint {
  label: string;
  kalshiProb: number;
  weatherProb: number;
  isPositiveEV: boolean;
  bestEdge: number;
}

export function ProbabilityChart({
  brackets,
  forecastMean,
  forecastSigma,
}: ProbabilityChartProps) {
  if (brackets.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5">
        <span className="text-foreground/40">No bracket data available</span>
      </div>
    );
  }

  // Build chart data: one group per bracket
  const chartData: ChartDataPoint[] = brackets.map((b) => ({
    label: b.bracket_label,
    kalshiProb: Number((b.kalshi_implied_prob * 100).toFixed(1)),
    weatherProb: Number((b.weather_prob * 100).toFixed(1)),
    isPositiveEV: b.is_positive_ev,
    bestEdge: b.best_edge,
  }));

  return (
    <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/60">
          Probability Distribution: Our Model vs. Kalshi Market
        </h3>
        <div className="text-xs text-foreground/40">
          Forecast: {forecastMean.toFixed(0)}°F ± {forecastSigma.toFixed(1)}°F
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 20, bottom: 30, left: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="currentColor"
            opacity={0.1}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            label={{
              value: "Probability %",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12 },
            }}
          />
          <Tooltip
            content={({ payload, label }) => {
              if (!payload || payload.length === 0) return null;
              const point = payload[0]?.payload as ChartDataPoint;
              const diff = point.weatherProb - point.kalshiProb;
              return (
                <div className="rounded-lg border border-foreground/10 bg-background p-3 shadow-lg text-sm">
                  <p className="mb-1 font-medium">{label}</p>
                  <p style={{ color: "#f97316" }}>
                    Kalshi: {point.kalshiProb.toFixed(1)}%
                  </p>
                  <p style={{ color: "#3b82f6" }}>
                    Our Model: {point.weatherProb.toFixed(1)}%
                  </p>
                  <p
                    className={`mt-1 font-medium ${diff > 0 ? "text-green-600" : "text-red-500"}`}
                  >
                    Edge: {diff > 0 ? "+" : ""}
                    {diff.toFixed(1)}%
                  </p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Bar
            dataKey="kalshiProb"
            fill="#f97316"
            fillOpacity={0.8}
            name="Kalshi Implied %"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="weatherProb"
            name="Our Model %"
            radius={[2, 2, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isPositiveEV ? "#22c55e" : "#3b82f6"}
                fillOpacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

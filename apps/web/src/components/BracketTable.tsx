"use client";

import type { EVCalculationRow } from "@kalshi-ev/shared";
import { EVBadge } from "./EVBadge";

interface BracketTableProps {
  brackets: EVCalculationRow[];
}

export function BracketTable({ brackets }: BracketTableProps) {
  if (brackets.length === 0) {
    return (
      <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-6 text-center text-foreground/40">
        No bracket data available
      </div>
    );
  }

  // Find the best +EV bracket to highlight
  const bestBracket = brackets.reduce((best, b) =>
    b.best_edge > (best?.best_edge ?? -Infinity) ? b : best
  );

  return (
    <div className="rounded-lg border border-foreground/10">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/5">
              <th className="px-4 py-3 text-left font-medium">Bracket</th>
              <th className="px-4 py-3 text-right font-medium">Bid</th>
              <th className="px-4 py-3 text-right font-medium">Ask</th>
              <th className="px-4 py-3 text-right font-medium">Kalshi %</th>
              <th className="px-4 py-3 text-right font-medium">Our %</th>
              <th className="px-4 py-3 text-right font-medium">EV (YES)</th>
              <th className="px-4 py-3 text-right font-medium">EV (NO)</th>
              <th className="px-4 py-3 text-right font-medium">Best Edge</th>
            </tr>
          </thead>
          <tbody>
            {brackets.map((b) => {
              const isBest = b.market_ticker === bestBracket.market_ticker && b.is_positive_ev;
              const rowBg = b.is_positive_ev
                ? b.best_edge > 0.05
                  ? "bg-green-50 dark:bg-green-950/20"
                  : "bg-yellow-50 dark:bg-yellow-950/20"
                : "";

              return (
                <tr
                  key={b.market_ticker}
                  className={`border-b border-foreground/5 ${rowBg} ${isBest ? "font-semibold" : ""}`}
                >
                  <td className="px-4 py-2.5">
                    {b.bracket_label}
                    {isBest && (
                      <span className="ml-2 text-xs text-green-600">BEST</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    ${b.kalshi_yes_bid.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    ${b.kalshi_yes_ask.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {(b.kalshi_implied_prob * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {(b.weather_prob * 100).toFixed(1)}%
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${b.ev_yes > 0 ? "text-green-600" : "text-red-500"}`}>
                    {(b.ev_yes * 100).toFixed(1)}%
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${b.ev_no > 0 ? "text-green-600" : "text-red-500"}`}>
                    {(b.ev_no * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <EVBadge edge={b.best_edge} side={b.best_side} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

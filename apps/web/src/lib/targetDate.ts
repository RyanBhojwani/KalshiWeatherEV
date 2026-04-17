/**
 * Compute the dashboard's target event date.
 *
 * Kalshi settles on America/New_York time. Most US cities hit their daily
 * high by late afternoon — by 5pm ET every timezone's high is locked or
 * nearly locked, so that's when we pivot the dashboard to tomorrow.
 *
 * Returns YYYY-MM-DD in ET.
 */
const SWITCH_TO_TOMORROW_ET_HOUR = 17;

export function getTargetDateET(now: Date = new Date()): string {
  const etHourStr = now.toLocaleString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  });
  const etHour = parseInt(etHourStr, 10);

  const etDateStr = now.toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [month, day, year] = etDateStr.split(/[\/,\s]+/).filter(Boolean);
  const etDate = new Date(`${year}-${month}-${day}T00:00:00Z`);

  if (etHour >= SWITCH_TO_TOMORROW_ET_HOUR) {
    etDate.setUTCDate(etDate.getUTCDate() + 1);
  }

  return etDate.toISOString().split("T")[0];
}

/**
 * True if the bracket is tradable on Kalshi — price in [0.10, 0.90] and
 * spread under 8 cents. Filters out near-settled markets and illiquid tails.
 */
export function isTradable(row: {
  kalshi_yes_ask: number;
  kalshi_yes_bid: number;
}): boolean {
  const ask = row.kalshi_yes_ask;
  const spread = ask - row.kalshi_yes_bid;
  return ask >= 0.1 && ask <= 0.9 && spread < 0.08;
}

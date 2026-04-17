import {
  KALSHI_API_BASE,
  KALSHI_DELAY_BETWEEN_REQUESTS_MS,
  CITIES,
  type KalshiEvent,
  type KalshiEventsResponse,
  type KalshiMarket,
  type TemperatureBracket,
  type TemperatureEvent,
  type CityConfig,
} from "@kalshi-ev/shared";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch events for a given series ticker (e.g., KXHIGHNY) with nested markets.
 * Public endpoint — no authentication needed.
 */
async function fetchEventsForSeries(
  seriesTicker: string
): Promise<KalshiEvent[]> {
  const url = new URL(`${KALSHI_API_BASE}/events`);
  url.searchParams.set("series_ticker", seriesTicker);
  url.searchParams.set("status", "open");
  url.searchParams.set("with_nested_markets", "true");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Kalshi API error ${response.status} for ${seriesTicker}: ${text}`
    );
  }

  const data = (await response.json()) as KalshiEventsResponse;
  return data.events || [];
}

/**
 * Parse a Kalshi market into a typed TemperatureBracket.
 */
function parseMarketBracket(market: KalshiMarket): TemperatureBracket {
  const yesBid = parseFloat(market.yes_bid_dollars) || 0;
  const yesAsk = parseFloat(market.yes_ask_dollars) || 0;
  const noBid = parseFloat(market.no_bid_dollars) || 0;
  const noAsk = parseFloat(market.no_ask_dollars) || 0;

  return {
    marketTicker: market.ticker,
    eventTicker: market.event_ticker,
    label: market.yes_sub_title,
    floorStrike: market.floor_strike,
    capStrike: market.cap_strike,
    strikeType: market.strike_type,
    yesBid,
    yesAsk,
    noBid,
    noAsk,
    impliedProb: (yesBid + yesAsk) / 2, // midpoint as implied probability
    lastPrice: parseFloat(market.last_price_dollars) || 0,
    volume: market.volume_fp,
    closeTime: market.close_time,
  };
}

/**
 * Extract the measurement date (YYYY-MM-DD) from a Kalshi event.
 * Ticker format: KXHIGHNY-26APR17 → 2026-04-17
 *
 * Do NOT use event.strike_date — that is the settlement cutoff timestamp
 * (next-day UTC ~8:00 or 03:59), which is always one calendar day after
 * the measurement date. The ticker suffix is the authoritative source.
 */
function extractEventDate(event: KalshiEvent): string {
  // Parse from ticker: KXHIGHNY-26APR17
  const parts = event.event_ticker.split("-");
  if (parts.length >= 2) {
    const datePart = parts[parts.length - 1]; // "26APR17"
    const yearPrefix = datePart.slice(0, 2); // "26"
    const monthStr = datePart.slice(2, 5); // "APR"
    const day = datePart.slice(5); // "17"

    const months: Record<string, string> = {
      JAN: "01", FEB: "02", MAR: "03", APR: "04",
      MAY: "05", JUN: "06", JUL: "07", AUG: "08",
      SEP: "09", OCT: "10", NOV: "11", DEC: "12",
    };

    const month = months[monthStr.toUpperCase()];
    if (month) {
      return `20${yearPrefix}-${month}-${day.padStart(2, "0")}`;
    }
  }

  // Fallback: return today's date
  return new Date().toISOString().split("T")[0];
}

/**
 * Find the city config that matches a Kalshi series ticker.
 */
function findCityForSeries(seriesTicker: string): CityConfig | undefined {
  return CITIES.find((c) => c.kalshiSeriesTicker === seriesTicker);
}

/**
 * Fetch all active temperature events across all cities.
 * Returns parsed TemperatureEvent objects ready for EV calculation.
 */
export async function fetchAllCityEvents(): Promise<TemperatureEvent[]> {
  const allEvents: TemperatureEvent[] = [];

  for (const city of CITIES) {
    try {
      const events = await fetchEventsForSeries(city.kalshiSeriesTicker);

      for (const event of events) {
        const brackets = (event.markets || []).map(parseMarketBracket);

        // Skip events with no markets
        if (brackets.length === 0) continue;

        allEvents.push({
          eventTicker: event.event_ticker,
          seriesTicker: event.series_ticker || city.kalshiSeriesTicker,
          citySlug: city.slug,
          eventDate: extractEventDate(event),
          title: event.title,
          brackets,
        });
      }

      // Rate limiting: small delay between city requests
      await sleep(KALSHI_DELAY_BETWEEN_REQUESTS_MS);
    } catch (error) {
      console.error(
        `Failed to fetch Kalshi events for ${city.displayName}:`,
        error
      );
      // Continue to next city — one failure shouldn't block others
    }
  }

  return allEvents;
}

/**
 * Convert TemperatureEvent brackets into market_snapshots row format
 * for upserting to Supabase.
 */
export function eventToSnapshotRows(
  event: TemperatureEvent,
  cityId: string
): Array<{
  city_id: string;
  event_ticker: string;
  market_ticker: string;
  event_date: string;
  yes_sub_title: string;
  floor_strike: number | null;
  cap_strike: number | null;
  strike_type: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: string;
  open_interest: string;
  close_time: string;
  status: string;
  fetched_at: string;
}> {
  const now = new Date().toISOString();

  return event.brackets.map((b) => ({
    city_id: cityId,
    event_ticker: event.eventTicker,
    market_ticker: b.marketTicker,
    event_date: event.eventDate,
    yes_sub_title: b.label,
    floor_strike: b.floorStrike,
    cap_strike: b.capStrike,
    strike_type: b.strikeType,
    yes_bid: b.yesBid,
    yes_ask: b.yesAsk,
    no_bid: b.noBid,
    no_ask: b.noAsk,
    last_price: b.lastPrice,
    volume: b.volume,
    open_interest: "",
    close_time: b.closeTime,
    status: "open",
    fetched_at: now,
  }));
}

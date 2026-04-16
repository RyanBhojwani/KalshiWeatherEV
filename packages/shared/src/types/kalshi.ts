// Kalshi API response types
// Base URL: https://api.elections.kalshi.com/trade-api/v2

export interface KalshiEvent {
  event_ticker: string; // e.g., "KXHIGHNY-26APR17"
  series_ticker: string; // e.g., "KXHIGHNY"
  title: string;
  sub_title: string;
  mutually_exclusive: boolean;
  category: string;
  strike_date: string; // ISO date
  markets?: KalshiMarket[];
}

export interface KalshiMarket {
  ticker: string; // e.g., "KXHIGHNY-26APR17-B77.5"
  event_ticker: string;
  yes_bid_dollars: string; // e.g., "0.38"
  yes_ask_dollars: string;
  no_bid_dollars: string;
  no_ask_dollars: string;
  last_price_dollars: string;
  floor_strike: number | null;
  cap_strike: number | null;
  strike_type: "between" | "less" | "greater";
  yes_sub_title: string; // e.g., "77° to 78°"
  no_sub_title: string;
  close_time: string; // ISO datetime
  status: string;
  volume_fp: string;
  open_interest_fp: string;
  result: string;
}

export interface KalshiEventsResponse {
  events: KalshiEvent[];
  cursor: string;
}

export interface KalshiMarketsResponse {
  markets: KalshiMarket[];
  cursor: string;
}

export interface KalshiOrderbook {
  yes: [number, number][]; // [price, quantity]
  no: [number, number][];
}

// Parsed bracket from Kalshi market data
export interface TemperatureBracket {
  marketTicker: string;
  eventTicker: string;
  label: string; // "77° to 78°"
  floorStrike: number | null;
  capStrike: number | null;
  strikeType: "between" | "less" | "greater";
  yesBid: number;
  yesAsk: number;
  noBid: number;
  noAsk: number;
  impliedProb: number; // midpoint of bid/ask
  lastPrice: number;
  volume: string;
  closeTime: string;
}

// Parsed event with all its brackets
export interface TemperatureEvent {
  eventTicker: string;
  seriesTicker: string;
  citySlug: string;
  eventDate: string; // YYYY-MM-DD
  title: string;
  brackets: TemperatureBracket[];
}

// EV calculation types

export interface BracketEV {
  marketTicker: string;
  eventTicker: string;
  bracketLabel: string;
  floorStrike: number | null;
  capStrike: number | null;

  // Kalshi market data
  kalshiYesBid: number;
  kalshiYesAsk: number;
  kalshiImpliedProb: number; // midpoint of bid/ask

  // Our weather-derived probability
  weatherProb: number;
  forecastMean: number;
  forecastSigma: number;
  forecastSpread: number | null; // |NWS - OpenMeteo| when both present

  // EV results
  evYes: number; // weatherProb - yesAsk
  evNo: number; // (1 - weatherProb) - noAsk
  bestEdge: number; // max(evYes, evNo)
  bestSide: "YES" | "NO";
  isPositiveEV: boolean;

  // Metadata
  weatherSource: string;
}

export interface CityEVSummary {
  citySlug: string;
  cityName: string;
  eventDate: string;
  forecastHigh: number;
  forecastSigma: number;
  totalBrackets: number;
  positiveEVCount: number;
  bestBracket: BracketEV | null;
  brackets: BracketEV[];
}

// For the distribution chart overlay
export interface DistributionPoint {
  temperature: number;
  gaussianDensity: number; // Our probability density at this temp
  kalshiDensity: number; // Kalshi implied density at this temp (from bracket widths)
}

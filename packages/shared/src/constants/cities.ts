export interface CityConfig {
  slug: string;
  displayName: string;
  kalshiSeriesTicker: string;
  latitude: number;
  longitude: number;
  timezone: string;
  nwsOffice: string;
  nwsGridX: number;
  nwsGridY: number;
  // Sigma (std dev in °F) for forecast error by days ahead
  sigmaDays: [number, number, number]; // [day1, day2, day3+]
}

export const CITIES: CityConfig[] = [
  {
    slug: "nyc",
    displayName: "New York City",
    kalshiSeriesTicker: "KXHIGHNY",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
    nwsOffice: "OKX",
    nwsGridX: 33,
    nwsGridY: 37,
    sigmaDays: [3.0, 5.0, 6.0],
  },
  {
    slug: "chicago",
    displayName: "Chicago",
    kalshiSeriesTicker: "KXHIGHCHI",
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: "America/Chicago",
    nwsOffice: "LOT",
    nwsGridX: 65,
    nwsGridY: 76,
    sigmaDays: [3.5, 5.5, 6.5],
  },
  {
    slug: "la",
    displayName: "Los Angeles",
    kalshiSeriesTicker: "KXHIGHLAX",
    latitude: 34.0522,
    longitude: -118.2437,
    timezone: "America/Los_Angeles",
    nwsOffice: "LOX",
    nwsGridX: 154,
    nwsGridY: 44,
    sigmaDays: [2.5, 4.0, 5.0],
  },
  {
    slug: "miami",
    displayName: "Miami",
    kalshiSeriesTicker: "KXHIGHMIA",
    latitude: 25.7617,
    longitude: -80.1918,
    timezone: "America/New_York",
    nwsOffice: "MFL",
    nwsGridX: 75,
    nwsGridY: 53,
    sigmaDays: [2.0, 3.5, 4.5],
  },
  {
    slug: "denver",
    displayName: "Denver",
    kalshiSeriesTicker: "KXHIGHDEN",
    latitude: 39.7392,
    longitude: -104.9903,
    timezone: "America/Denver",
    nwsOffice: "BOU",
    nwsGridX: 62,
    nwsGridY: 60,
    sigmaDays: [4.0, 6.0, 7.0],
  },
  {
    slug: "austin",
    displayName: "Austin",
    kalshiSeriesTicker: "KXHIGHAUS",
    latitude: 30.2672,
    longitude: -97.7431,
    timezone: "America/Chicago",
    nwsOffice: "EWX",
    nwsGridX: 116,
    nwsGridY: 92,
    sigmaDays: [3.0, 5.0, 6.0],
  },
];

// Lookup helpers
export function getCityBySlug(slug: string): CityConfig | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function getCityByTicker(ticker: string): CityConfig | undefined {
  return CITIES.find((c) => c.kalshiSeriesTicker === ticker);
}

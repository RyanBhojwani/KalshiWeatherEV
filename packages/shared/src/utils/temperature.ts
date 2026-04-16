/**
 * Temperature probability math using Gaussian (Normal) distribution.
 *
 * We model the actual temperature as N(μ, σ²) where:
 * - μ = weather API point forecast
 * - σ = estimated forecast error (varies by city, season, lead time)
 *
 * For each Kalshi bracket [a, b], our probability = Φ((b-μ)/σ) - Φ((a-μ)/σ)
 * where Φ is the standard normal CDF.
 */

/**
 * Standard normal CDF using Abramowitz & Stegun approximation (eq. 7.1.26).
 * Maximum error: 1.5 × 10⁻⁷
 */
export function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Standard normal PDF (probability density function).
 * Used for plotting the Gaussian curve on the distribution chart.
 */
export function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Calculate the probability that the temperature falls within a bracket.
 *
 * @param floorStrike - Lower bound of bracket (null for "less than" tail)
 * @param capStrike - Upper bound of bracket (null for "greater than" tail)
 * @param strikeType - "between", "less", or "greater"
 * @param mean - Forecast temperature (μ)
 * @param sigma - Forecast standard deviation (σ)
 * @returns Probability [0, 1] that actual temp falls in this bracket
 */
export function bracketProbability(
  floorStrike: number | null,
  capStrike: number | null,
  strikeType: string,
  mean: number,
  sigma: number
): number {
  if (sigma <= 0) {
    throw new Error("Sigma must be positive");
  }

  let prob: number;

  if (strikeType === "less" || strikeType === "less_or_equal") {
    // Tail bracket: temp < capStrike (e.g., "76° or below")
    prob = normalCDF((capStrike! - mean) / sigma);
  } else if (strikeType === "greater" || strikeType === "greater_or_equal") {
    // Tail bracket: temp > floorStrike (e.g., "85° or above")
    prob = 1 - normalCDF((floorStrike! - mean) / sigma);
  } else {
    // Between bracket: floorStrike ≤ temp < capStrike
    const pLower = normalCDF((floorStrike! - mean) / sigma);
    const pUpper = normalCDF((capStrike! - mean) / sigma);
    prob = pUpper - pLower;
  }

  // Clamp to avoid extreme values
  return Math.max(0.001, Math.min(0.999, prob));
}

/**
 * Calculate EV for buying YES or NO on a bracket.
 *
 * @param weatherProb - Our probability that this bracket hits
 * @param yesBid - Best bid price for YES (what you'd get selling)
 * @param yesAsk - Best ask price for YES (what you'd pay buying)
 * @returns EV analysis for both sides
 */
export function calculateBracketEV(
  weatherProb: number,
  yesBid: number,
  yesAsk: number
): {
  evYes: number;
  evNo: number;
  bestEdge: number;
  bestSide: "YES" | "NO";
  isPositiveEV: boolean;
} {
  // EV(YES) = P(win) × $1 - cost = weatherProb - yesAsk
  const evYes = weatherProb - yesAsk;

  // EV(NO) = P(bracket doesn't hit) × $1 - cost
  // NO ask price = 1 - yesBid (complement pricing)
  const noAsk = 1 - yesBid;
  const evNo = (1 - weatherProb) - noAsk;

  const bestEdge = Math.max(evYes, evNo);
  const bestSide: "YES" | "NO" = evYes >= evNo ? "YES" : "NO";

  return {
    evYes,
    evNo,
    bestEdge,
    bestSide,
    isPositiveEV: bestEdge > 0,
  };
}

/**
 * Select the appropriate sigma based on how many days ahead the forecast is.
 *
 * @param sigmaDays - Array of sigma values [day1, day2, day3+]
 * @param daysAhead - Number of days between now and the event date (1 = tomorrow)
 */
export function selectSigma(
  sigmaDays: [number, number, number],
  daysAhead: number
): number {
  if (daysAhead <= 1) return sigmaDays[0];
  if (daysAhead === 2) return sigmaDays[1];
  return sigmaDays[2];
}

/**
 * Generate points for plotting the Gaussian distribution curve.
 * Used by the frontend detail view chart.
 *
 * @param mean - Center of the distribution
 * @param sigma - Standard deviation
 * @param numPoints - Number of points to generate (default 50)
 * @returns Array of {temperature, density} pairs
 */
export function generateGaussianCurve(
  mean: number,
  sigma: number,
  numPoints: number = 50
): { temperature: number; density: number }[] {
  const points: { temperature: number; density: number }[] = [];
  const range = 4 * sigma;
  const step = (2 * range) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const temp = mean - range + i * step;
    const z = (temp - mean) / sigma;
    const density = normalPDF(z) / sigma; // Scale by 1/sigma for proper PDF
    points.push({ temperature: Math.round(temp * 10) / 10, density });
  }

  return points;
}

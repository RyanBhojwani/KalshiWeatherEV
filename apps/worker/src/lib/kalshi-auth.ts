/**
 * Kalshi RSA-PSS authentication utility.
 * Not needed for v1 (public market data), but built for future order placement.
 *
 * Authentication requires:
 * - KALSHI-ACCESS-KEY: Your API Key ID
 * - KALSHI-ACCESS-TIMESTAMP: Request timestamp in milliseconds
 * - KALSHI-ACCESS-SIGNATURE: RSA-PSS signature of (timestamp + method + path)
 */

import crypto from "crypto";

interface KalshiAuthHeaders {
  "KALSHI-ACCESS-KEY": string;
  "KALSHI-ACCESS-TIMESTAMP": string;
  "KALSHI-ACCESS-SIGNATURE": string;
}

/**
 * Generate authentication headers for a Kalshi API request.
 *
 * @param apiKeyId - Your Kalshi API Key ID
 * @param privateKeyPem - RSA private key in PEM format
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - Request path WITHOUT query params (e.g., /trade-api/v2/markets)
 */
export function generateKalshiAuthHeaders(
  apiKeyId: string,
  privateKeyPem: string,
  method: string,
  path: string
): KalshiAuthHeaders {
  const timestamp = Date.now().toString();
  const message = `${timestamp}${method.toUpperCase()}${path}`;

  const signature = crypto.sign("sha256", Buffer.from(message), {
    key: privateKeyPem,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
  });

  return {
    "KALSHI-ACCESS-KEY": apiKeyId,
    "KALSHI-ACCESS-TIMESTAMP": timestamp,
    "KALSHI-ACCESS-SIGNATURE": signature.toString("base64"),
  };
}

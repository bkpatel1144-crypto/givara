/**
 * All external network communication lives here.
 *
 * The Origem ring builder price endpoint is publicly browser-accessible:
 *   access-control-allow-origin: *
 *   access-control-allow-methods: POST, OPTIONS
 * so the browser calls it directly. No backend, no proxy.
 *
 * See docs/public-api-map.md for the full inventory (and for the endpoints
 * that are NOT browser-accessible and therefore intentionally unused).
 */
import type {
  CalculatePriceRequest,
  CalculatePriceResponse,
  PriceData,
} from "@/types/pricing";
import type { RingConfiguration } from "@/types/ring";

export const ORIGEM_BASE = "https://www.ringbuilder.origemindia.com";

export function toPriceRequest(config: RingConfiguration): CalculatePriceRequest {
  return {
    diamondShape: config.diamondShape,
    centerDiamondSize: parseFloat(config.centerDiamondSize),
    crownSetting: config.crownSetting,
    ringStyle: config.ringStyle,
    sideSetting: config.sideSetting,
    metalKarat: config.metalKarat,
    ringSize: config.ringSize,
  };
}

export async function calculatePrice(
  config: RingConfiguration,
  signal?: AbortSignal,
): Promise<PriceData> {
  const res = await fetch(`${ORIGEM_BASE}/api/calculate-price`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toPriceRequest(config)),
    signal: signal ?? null,
  });

  if (!res.ok) {
    throw new Error(`Price request failed (${res.status})`);
  }

  const json = (await res.json()) as CalculatePriceResponse;
  if (json.status !== "success" || !json.data) {
    throw new Error("Price request returned an unexpected payload");
  }
  return json.data;
}

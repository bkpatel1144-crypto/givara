/**
 * Sales markets: currency, tax presentation and the ring size system shown to
 * shoppers. Prices are calculated in the pricing base currency (see
 * config/pricing.ts) and converted with `rateFromBase`.
 *
 * ⚠ DEMO VALUES — exchange rates and tax rates must be confirmed by Givara
 * before going live. Rates are static on purpose (no runtime FX dependency);
 * update them together with FX_RATES_AS_OF.
 */
import type { RingSizeSystem } from "@/data/ringSizes";

export type MarketId = "US" | "UK" | "EU" | "AE" | "AU" | "IN";

export interface TaxRule {
  /** Shown in the price breakup, e.g. "VAT". */
  label: string;
  /** 0.2 = 20%. */
  rate: number;
  /**
   * true  → displayed prices include the tax (UK/EU/AU/AE/IN convention).
   * false → prices are shown before tax, which is added at checkout (US).
   */
  included: boolean;
}

export interface Market {
  id: MarketId;
  label: string;
  currency: string;
  locale: string;
  /** Units of this currency per 1 unit of the pricing base currency. */
  rateFromBase: number;
  /** Round the final total to this step (e.g. 10 → 2,340). */
  roundTo: number;
  tax: TaxRule;
  sizeSystem: RingSizeSystem;
}

export const FX_RATES_AS_OF = "2026-09-01 (demo values)";

export const MARKETS: Record<MarketId, Market> = {
  US: {
    id: "US",
    label: "United States · USD",
    currency: "USD",
    locale: "en-US",
    rateFromBase: 1,
    roundTo: 5,
    tax: { label: "Sales tax", rate: 0, included: false },
    sizeSystem: "US",
  },
  UK: {
    id: "UK",
    label: "United Kingdom · GBP",
    currency: "GBP",
    locale: "en-GB",
    rateFromBase: 0.76,
    roundTo: 5,
    tax: { label: "VAT", rate: 0.2, included: true },
    sizeSystem: "UK",
  },
  EU: {
    id: "EU",
    label: "Europe · EUR",
    currency: "EUR",
    locale: "en-IE",
    rateFromBase: 0.88,
    roundTo: 5,
    // VAT differs per EU country; 21% is a representative demo value.
    tax: { label: "VAT", rate: 0.21, included: true },
    sizeSystem: "EU",
  },
  AE: {
    id: "AE",
    label: "United Arab Emirates · AED",
    currency: "AED",
    locale: "en-AE",
    rateFromBase: 3.6725,
    roundTo: 10,
    tax: { label: "VAT", rate: 0.05, included: true },
    sizeSystem: "US",
  },
  AU: {
    id: "AU",
    label: "Australia · AUD",
    currency: "AUD",
    locale: "en-AU",
    rateFromBase: 1.53,
    roundTo: 5,
    tax: { label: "GST", rate: 0.1, included: true },
    sizeSystem: "UK",
  },
  IN: {
    id: "IN",
    label: "India · INR",
    currency: "INR",
    locale: "en-IN",
    rateFromBase: 86,
    roundTo: 100,
    tax: { label: "GST", rate: 0.03, included: true },
    sizeSystem: "IN",
  },
};

export const MARKET_LIST: Market[] = Object.values(MARKETS);

export function isMarketId(value: string | null | undefined): value is MarketId {
  return Boolean(value && Object.prototype.hasOwnProperty.call(MARKETS, value));
}

/** Set VITE_DEFAULT_MARKET (US, UK, EU, AE, AU, IN) to change the first-visit market. */
export const DEFAULT_MARKET_ID: MarketId = isMarketId(import.meta.env.VITE_DEFAULT_MARKET)
  ? import.meta.env.VITE_DEFAULT_MARKET
  : "US";

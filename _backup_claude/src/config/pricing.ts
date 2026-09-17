/**
 * Givara pricing rate card.
 *
 * ⚠ DEMO VALUES — every number here is a placeholder chosen to produce
 * realistic-looking retail prices for a lab-grown diamond engagement ring.
 * Replace them with Givara's real metal rates, CAD weights, diamond price
 * list and labour costs before quoting customers.
 *
 * All money is in BASE_CURRENCY; config/markets.ts converts to each market.
 */
import type {
  Carat,
  CrownSetting,
  DiamondShape,
  MetalKarat,
  RingStyle,
  SideSetting,
} from "@/types/ring";

export const BASE_CURRENCY = "USD";

/** Fine (24kt) gold price per gram. Update from the daily fix. */
export const FINE_GOLD_PER_GRAM = 110;

export const KARAT: Record<MetalKarat, { label: string; purity: number; densityFactor: number }> = {
  // densityFactor: weights below are for 14kt; 18kt alloy is heavier for the same CAD volume.
  "14kt": { label: "14KT", purity: 0.585, densityFactor: 1 },
  "18kt": { label: "18KT", purity: 0.75, densityFactor: 1.19 },
};

/** Surcharge on the fine-gold content for alloying, refining and casting loss. */
export const ALLOY_SURCHARGE = 0.12;

/** Shank weight in grams for 14kt, US size 7. Replace with CAD weights. */
export const SHANK_WEIGHT_G: Record<RingStyle, number> = {
  "classic-straight": 2.4,
  "cathedral-straight": 2.8,
  twist: 2.9,
  split: 3.1,
  "two-row-split": 3.4,
  pinch: 2.6,
};

/** Metal removed for stone seats / added for channel walls. */
export const SIDE_SETTING_WEIGHT_FACTOR: Record<SideSetting, number> = {
  "plain-gold": 1,
  pave: 0.95,
  prong: 0.97,
  channel: 1.1,
};

/** Shank weight change per US size away from size 7 (≈ circumference change). */
export const WEIGHT_CHANGE_PER_US_SIZE = 0.047;
export const REFERENCE_US_SIZE = 7;

/** Head weight in grams for 14kt with a 1ct centre stone. */
export const HEAD_WEIGHT_G: Record<CrownSetting, number> = {
  classic: 0.35,
  "hidden-halo": 0.5,
  "single-halo": 0.75,
};

/** How much bigger the head (metal and halo) gets for each centre stone size. */
export const HEAD_SCALE: Record<Carat, number> = {
  "0.5": 0.8,
  "0.75": 0.9,
  "1": 1,
  "1.5": 1.15,
  "2": 1.3,
  "3": 1.55,
};

export const CENTRE_STONE_QUALITY = "Lab-grown · F–G · VS1+";

/** Centre stone price per carat, by carat size (larger stones cost more per carat). */
export const CENTRE_STONE_PER_CARAT: Record<Carat, number> = {
  "0.5": 700,
  "0.75": 760,
  "1": 820,
  "1.5": 880,
  "2": 950,
  "3": 1080,
};

/** Relative cutting yield by shape. */
export const SHAPE_PRICE_FACTOR: Record<DiamondShape, number> = {
  round: 1.1,
  princess: 0.95,
  oval: 1,
  pear: 1,
  emerald: 0.95,
  radiant: 0.97,
  marquise: 0.95,
  heart: 1.02,
  "elongated-cushion": 0.97,
};

export const ACCENT_STONE_QUALITY = "Lab-grown · G–H · VS";
/** Small accent (melee) stones, price per carat. */
export const ACCENT_STONE_PER_CARAT = 380;

/** Side stones on the shank for a single-row band. */
export const SHANK_STONES: Record<SideSetting, { count: number; caratEach: number }> = {
  "plain-gold": { count: 0, caratEach: 0 },
  pave: { count: 24, caratEach: 0.012 },
  prong: { count: 14, caratEach: 0.02 },
  channel: { count: 12, caratEach: 0.025 },
};

/** Split and two-row bands carry more stone rows. */
export const SHANK_STONE_ROW_FACTOR: Record<RingStyle, number> = {
  "classic-straight": 1,
  "cathedral-straight": 1,
  twist: 1,
  split: 1.5,
  "two-row-split": 2,
  pinch: 1,
};

/** Halo stones for a 1ct centre; count scales with HEAD_SCALE. */
export const HEAD_STONES: Record<CrownSetting, { count: number; caratEach: number }> = {
  classic: { count: 0, caratEach: 0 },
  "hidden-halo": { count: 16, caratEach: 0.006 },
  "single-halo": { count: 20, caratEach: 0.012 },
};

export const LABOUR = {
  /** Casting and finishing per gram of metal. */
  shankPerGram: 18,
  headPerGram: 26,
  /** Setting each accent stone. */
  perAccentStone: 2.5,
  /** Setting the centre stone. */
  centreStone: 45,
};

/**
 * Givara price engine — a pure, synchronous function of the ring configuration
 * and the shopper's market. No network calls: prices are instant, work offline,
 * and are driven entirely by config/pricing.ts and config/markets.ts.
 */
import {
  ACCENT_STONE_PER_CARAT,
  ACCENT_STONE_QUALITY,
  ALLOY_SURCHARGE,
  CENTRE_STONE_PER_CARAT,
  CENTRE_STONE_QUALITY,
  FINE_GOLD_PER_GRAM,
  HEAD_SCALE,
  HEAD_STONES,
  HEAD_WEIGHT_G,
  KARAT,
  LABOUR,
  REFERENCE_US_SIZE,
  SHANK_STONE_ROW_FACTOR,
  SHANK_STONES,
  SHANK_WEIGHT_G,
  SHAPE_PRICE_FACTOR,
  SIDE_SETTING_WEIGHT_FACTOR,
  WEIGHT_CHANGE_PER_US_SIZE,
} from "@/config/pricing";
import type { Market } from "@/config/markets";
import type { DiamondLine, PriceData } from "@/types/pricing";
import type { RingConfiguration } from "@/types/ring";

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

function accentLine(label: string, count: number, caratEach: number, fx: number): DiamondLine {
  const caratWeight = count * caratEach;
  return {
    label,
    quality: ACCENT_STONE_QUALITY,
    qty: count,
    caratWeight: round3(caratWeight),
    value: round2(caratWeight * ACCENT_STONE_PER_CARAT * fx),
  };
}

export function calculatePrice(config: RingConfiguration, market: Market): PriceData {
  const fx = market.rateFromBase;
  const karat = KARAT[config.metalKarat];
  const carat = Number(config.centerDiamondSize);
  const headScale = HEAD_SCALE[config.centerDiamondSize];
  const usSize = Number(config.ringSize);
  const sizeFactor =
    1 + (Number.isFinite(usSize) ? usSize - REFERENCE_US_SIZE : 0) * WEIGHT_CHANGE_PER_US_SIZE;

  // Metal
  const shankWeight = round3(
    SHANK_WEIGHT_G[config.ringStyle] *
      SIDE_SETTING_WEIGHT_FACTOR[config.sideSetting] *
      sizeFactor *
      karat.densityFactor,
  );
  const headWeight = round3(HEAD_WEIGHT_G[config.crownSetting] * headScale * karat.densityFactor);
  const totalWeight = round3(shankWeight + headWeight);
  const ratePerGram = FINE_GOLD_PER_GRAM * karat.purity * (1 + ALLOY_SURCHARGE) * fx;
  const metalValue = totalWeight * ratePerGram;

  // Diamonds
  const centre: DiamondLine = {
    label: "Centre diamond",
    quality: CENTRE_STONE_QUALITY,
    qty: 1,
    caratWeight: carat,
    value: round2(
      carat *
        CENTRE_STONE_PER_CARAT[config.centerDiamondSize] *
        SHAPE_PRICE_FACTOR[config.diamondShape] *
        fx,
    ),
  };

  const head = HEAD_STONES[config.crownSetting];
  const headSide = accentLine(
    "Halo diamonds",
    Math.round(head.count * headScale),
    head.caratEach,
    fx,
  );

  const shank = SHANK_STONES[config.sideSetting];
  const shankSide = accentLine(
    "Band diamonds",
    Math.round(shank.count * SHANK_STONE_ROW_FACTOR[config.ringStyle]),
    shank.caratEach,
    fx,
  );

  const diamondValue = centre.value + headSide.value + shankSide.value;

  // Labour
  const labourShank = shankWeight * LABOUR.shankPerGram * fx;
  const labourHead = headWeight * LABOUR.headPerGram * fx;
  const stoneSetting =
    (LABOUR.centreStone + (headSide.qty + shankSide.qty) * LABOUR.perAccentStone) * fx;
  const labourValue = labourShank + labourHead + stoneSetting;

  // Totals. The displayed total is rounded to the market's price step; tax is
  // derived from that rounded figure so the breakup always adds up.
  const netPrice = metalValue + diamondValue + labourValue;
  const { rate, included, label } = market.tax;
  const step = market.roundTo;
  const total = Math.max(
    step,
    Math.round((included ? netPrice * (1 + rate) : netPrice) / step) * step,
  );
  const subtotal = included ? total / (1 + rate) : total;
  const taxValue = included ? total - subtotal : subtotal * rate;

  return {
    currency: market.currency,
    metal: {
      label: `${karat.label} ${config.metal}`,
      purity: karat.purity,
      shankWeight,
      headWeight,
      totalWeight,
      ratePerGram: round2(ratePerGram),
      value: round2(metalValue),
    },
    diamonds: {
      centre,
      headSide,
      shankSide,
      value: round2(diamondValue),
    },
    labour: {
      shank: round2(labourShank),
      head: round2(labourHead),
      stoneSetting: round2(stoneSetting),
      value: round2(labourValue),
    },
    rounding: round2(subtotal - netPrice),
    subtotal: round2(subtotal),
    tax: { label, rate, included, value: round2(taxValue) },
    total,
  };
}

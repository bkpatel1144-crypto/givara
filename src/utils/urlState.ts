import { DEFAULT_CONFIGURATION, RING_SIZES } from "@/data/ringOptions";
import type { RingConfiguration } from "@/types/ring";

/** URL param name <-> configuration key, matching the reference app. */
const PARAM_MAP: Record<keyof RingConfiguration, string> = {
  sideSetting: "side_setting",
  metal: "metal",
  metalKarat: "metal_karat",
  crownSetting: "crown_setting",
  diamondShape: "diamond_shape",
  centerDiamondSize: "center_diamond_size",
  ringSize: "ring_size",
  ringStyle: "ring_style",
  engravingText: "engraving_text",
};

const ALLOWED: Record<string, string[]> = {
  ringStyle: [
    "classic-straight",
    "cathedral-straight",
    "twist",
    "split",
    "two-row-split",
    "pinch",
  ],
  sideSetting: ["plain-gold", "pave", "prong", "channel"],
  crownSetting: ["classic", "hidden-halo", "single-halo"],
  diamondShape: [
    "round",
    "princess",
    "oval",
    "pear",
    "emerald",
    "radiant",
    "marquise",
    "heart",
    "elongated-cushion",
  ],
  centerDiamondSize: ["0.5", "0.75", "1", "1.5", "2", "3"],
  metalKarat: ["14kt", "18kt"],
  metal: ["Yellow Gold", "White Gold", "Rose Gold"],
  ringSize: RING_SIZES,
};

export function parseConfigFromUrl(search: string): Partial<RingConfiguration> {
  const params = new URLSearchParams(search);
  const out: Record<string, string> = {};

  for (const [key, param] of Object.entries(PARAM_MAP)) {
    const raw = params.get(param);
    if (!raw) continue;
    const value = decodeURIComponent(raw).trim();
    if (key === "engravingText") {
      out[key] = value.slice(0, 18);
      continue;
    }
    const allowed = ALLOWED[key];
    if (!allowed) continue;
    const exact = allowed.find((a) => a.toLowerCase() === value.toLowerCase());
    if (exact) out[key] = exact;
  }
  return out as Partial<RingConfiguration>;
}

export function writeConfigToUrl(config: RingConfiguration): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [key, param] of Object.entries(PARAM_MAP)) {
    const value = config[key as keyof RingConfiguration];
    const fallback = DEFAULT_CONFIGURATION[key as keyof RingConfiguration];
    if (value && value !== fallback) url.searchParams.set(param, String(value));
    else url.searchParams.delete(param);
  }
  window.history.replaceState({}, "", url.toString());
}

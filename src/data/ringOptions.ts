import type {
  CrownSetting,
  MetalKarat,
  RingConfiguration,
  RingStyle,
  SideSetting,
} from "@/types/ring";

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const RING_STYLES: Option<RingStyle>[] = [
  { value: "classic-straight", label: "Classic Straight" },
  { value: "cathedral-straight", label: "Cathedral Straight" },
  { value: "twist", label: "Twist" },
  { value: "split", label: "Split" },
  { value: "two-row-split", label: "Two Row Split" },
  { value: "pinch", label: "Pinch" },
];

export const SIDE_SETTINGS: Option<SideSetting>[] = [
  { value: "plain-gold", label: "Plain Gold" },
  { value: "pave", label: "Pavé" },
  { value: "prong", label: "Prong" },
  { value: "channel", label: "Channel" },
];

export const CROWN_SETTINGS: Option<CrownSetting>[] = [
  { value: "classic", label: "No Halo" },
  { value: "hidden-halo", label: "Hidden Halo" },
  { value: "single-halo", label: "Single Halo" },
];

export const METAL_KARATS: Option<MetalKarat>[] = [
  { value: "14kt", label: "14KT" },
  { value: "18kt", label: "18KT" },
];

/** Ring sizes accepted by the reference application. */
export const RING_SIZES: string[] = Array.from({ length: 19 }, (_, i) => String(i + 6));

export const DEFAULT_CONFIGURATION: RingConfiguration = {
  diamondShape: "oval",
  centerDiamondSize: "1",
  crownSetting: "hidden-halo",
  ringStyle: "cathedral-straight",
  sideSetting: "pave",
  metal: "White Gold",
  metalKarat: "14kt",
  ringSize: "7",
};

export const WHATSAPP_NUMBER = "918000000000";
export const BRAND_NAME = "Givara Jewelry";

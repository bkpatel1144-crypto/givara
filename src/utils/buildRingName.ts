import type { RingConfiguration } from "@/types/ring";

const SHAPE_LABELS: Record<string, string> = {
  round: "Round",
  princess: "Princess",
  oval: "Oval",
  pear: "Pear",
  emerald: "Emerald",
  radiant: "Radiant",
  marquise: "Marquise",
  heart: "Heart",
  "elongated-cushion": "Elongated Cushion",
};

const STYLE_LABELS: Record<string, string> = {
  "classic-straight": "Classic",
  "cathedral-straight": "Cathedral",
  twist: "Twist",
  split: "Split",
  "two-row-split": "Two Row Split",
  pinch: "Pinch",
};

const CROWN_LABELS: Record<string, string> = {
  classic: "",
  "hidden-halo": "Hidden Halo",
  "single-halo": "Halo",
};

const SIDE_LABELS: Record<string, string> = {
  "plain-gold": "",
  pave: "Pavé",
  prong: "Prong",
  channel: "Channel",
};

export function buildRingName(config: RingConfiguration): string {
  const shape = SHAPE_LABELS[config.diamondShape] ?? config.diamondShape;
  const style = STYLE_LABELS[config.ringStyle] ?? config.ringStyle;
  const crown = CROWN_LABELS[config.crownSetting] ?? "";
  const side = SIDE_LABELS[config.sideSetting] ?? "";

  const parts = ["Solitaire", shape];
  if (crown) parts.push(crown);
  parts.push(style, "Ring");
  if (side) parts.push("with", side, "Diamonds");
  return parts.join(" ");
}

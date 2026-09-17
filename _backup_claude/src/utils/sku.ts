import type { RingConfiguration } from "@/types/ring";

const STYLE: Record<RingConfiguration["ringStyle"], string> = {
  "classic-straight": "CL",
  "cathedral-straight": "CA",
  twist: "TW",
  split: "SP",
  "two-row-split": "TR",
  pinch: "PI",
};

const SIDE: Record<RingConfiguration["sideSetting"], string> = {
  "plain-gold": "PG",
  pave: "PV",
  prong: "PR",
  channel: "CH",
};

const SHAPE: Record<RingConfiguration["diamondShape"], string> = {
  round: "RD",
  princess: "PR",
  oval: "OV",
  pear: "PE",
  emerald: "EM",
  radiant: "RA",
  marquise: "MQ",
  heart: "HT",
  "elongated-cushion": "EC",
};

const CROWN: Record<RingConfiguration["crownSetting"], string> = {
  classic: "NH",
  "hidden-halo": "HH",
  "single-halo": "SH",
};

const METAL: Record<RingConfiguration["metal"], string> = {
  "White Gold": "W",
  "Yellow Gold": "Y",
  "Rose Gold": "R",
};

/**
 * Human-readable Givara design reference, e.g. GV-CA-PV-OV100-HH-W14-S070
 * (style, side setting, shape + carat×100, crown, metal + karat, US size×10).
 */
export function buildSku(config: RingConfiguration): string {
  const carat = String(Math.round(Number(config.centerDiamondSize) * 100)).padStart(3, "0");
  const size = String(Math.round(Number(config.ringSize) * 10)).padStart(3, "0");
  return [
    "GV",
    STYLE[config.ringStyle],
    SIDE[config.sideSetting],
    `${SHAPE[config.diamondShape]}${carat}`,
    CROWN[config.crownSetting],
    `${METAL[config.metal]}${config.metalKarat.replace("kt", "")}`,
    `S${size}`,
  ].join("-");
}

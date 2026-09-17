/**
 * Public CloudFront snapshot resolver.
 *
 * Naming scheme discovered in the reference frontend bundle:
 *   https://d2hjryo06kt5wm.cloudfront.net/snapshots/ring-{previewSku}-{style}-{view}.jpg
 * where `style` is the metal name lowercased with spaces replaced by dashes,
 * and `previewSku` is built from the configuration exactly as the reference
 * store does:
 *   RS{ringStyle}_SS{sideSetting}_DS{diamondShape}_C{carat}_CS{crownSetting}_MC{metal}
 */
import type { RingConfiguration, RingModelAssets, SnapshotViews, ViewName } from "@/types/ring";

export const CLOUDFRONT_BASE = "https://d2hjryo06kt5wm.cloudfront.net";
/**
 * GLBs are mirrored locally under `public/data/` (public/data/manifest.json is
 * the inventory) so the 360 viewer renders without hitting the reference host.
 * Snapshots stay remote: the full snapshot matrix is ~9 GB, so those keep
 * coming from CloudFront above.
 */
export const LOCAL_MODEL_BASE = "/data";

export function getSnapshotUrl(id: string, style: string, view: string): string {
  const normalizedStyle = style.toLowerCase().replace(/\s+/g, "-");
  return `${CLOUDFRONT_BASE}/snapshots/ring-${id}-${normalizedStyle}-${view}.jpg`;
}

export function getSnapshotUrls(id: string, style: string): SnapshotViews {
  return {
    front: getSnapshotUrl(id, style, "front"),
    side: getSnapshotUrl(id, style, "side"),
    top: getSnapshotUrl(id, style, "top"),
    angle: getSnapshotUrl(id, style, "angle"),
  };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/\//g, "-")
    .replace(/\./g, "p")
    .replace(/[^a-z0-9-]/g, "");
}

const MODEL_RING_STYLES: Record<RingConfiguration["ringStyle"], string> = {
  "classic-straight": "Straight",
  "cathedral-straight": "Cathedral",
  twist: "Twist",
  split: "Split",
  "two-row-split": "Two row split",
  pinch: "Pinch",
};

const MODEL_SIDE_SETTINGS: Record<RingConfiguration["sideSetting"], string> = {
  "plain-gold": "Plain Gold",
  pave: "French Pave",
  prong: "U Prong",
  channel: "Channel",
};

const MODEL_SHAPES: Record<RingConfiguration["diamondShape"], string> = {
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

const MODEL_CARATS: Record<string, string> = {
  "0.5": "0.50ct",
  "0.75": "0.75ct",
  "1": "1.0ct",
  "1.5": "1.5ct",
  "2": "2.0ct",
  "3": "3.0ct",
};

/**
 * Encode one path segment. Commas are left literal: they are valid sub-delims
 * in a path segment, and Vite's static middleware does not decode `%2C`, so
 * escaping them 404s every "No, Hidden Halo" band.
 */
function encodeSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/%2C/g, ",");
}

function modelPath(...segments: string[]): string {
  return `${LOCAL_MODEL_BASE}/${segments.map(encodeSegment).join("/")}`;
}

/** Public GLB composition used by the reference builder. */
export function getRingModelAssets(config: RingConfiguration): RingModelAssets {
  const headStyle = {
    classic: "No Halo",
    "hidden-halo": "Hidden Halo",
    "single-halo": "Single Halo",
  }[config.crownSetting];
  const shape = MODEL_SHAPES[config.diamondShape];
  const carat = MODEL_CARATS[String(parseFloat(config.centerDiamondSize))] ?? "1.0ct";
  const headFolder = `${carat} ${headStyle}`;
  const headBase = ["models_final", "HEAD_final", headStyle, shape, headFolder];
  const headPrefix = ["Head", headStyle, shape, carat];
  const ringStyle = MODEL_RING_STYLES[config.ringStyle];
  const sideSetting = MODEL_SIDE_SETTINGS[config.sideSetting];
  const bandStyle = config.crownSetting === "single-halo" ? "Single Halo" : "No, Hidden Halo";
  const bandVariant = parseFloat(config.centerDiamondSize) > 1 ? "B" : "A";
  const bandFolder = [
    "models_final",
    "SHANK_final",
    bandVariant,
    ringStyle,
    sideSetting,
    bandVariant,
    bandStyle,
  ];
  const bandPrefix = ["Shank", ringStyle, sideSetting, bandVariant, bandStyle];

  // A "No Halo" head carries no halo stones and a "Plain Gold" band no pave, so
  // the reference host ships no accent GLB for those combinations. Emitting the
  // URL anyway makes <extra-model> 404 and tips the whole viewer into its image
  // fallback, so resolve them to null instead.
  const hasHeadAccents = headStyle !== "No Halo";
  const hasBandAccents = sideSetting !== "Plain Gold";

  return {
    diamondPath: modelPath(...headBase, `${headPrefix.join("_")}_Diamond.glb`),
    headPath: modelPath(...headBase, `${headPrefix.join("_")}_Head.glb`),
    headDiamondPath: hasHeadAccents
      ? modelPath(...headBase, `${headPrefix.join("_")}_Head_diamond.glb`)
      : null,
    bandPath: modelPath(...bandFolder, `${bandPrefix.join("_")}_Band.glb`),
    bandDiamondPath: hasBandAccents
      ? modelPath(...bandFolder, `${bandPrefix.join("_")}_Band_diamond.glb`)
      : null,
  };
}

/** Asset SKU used for snapshot lookups. */
export function buildPreviewSku(config: RingConfiguration): string {
  const carat = parseFloat(config.centerDiamondSize);
  return [
    `RS${slug(config.ringStyle)}`,
    `SS${slug(config.sideSetting)}`,
    `DS${slug(config.diamondShape)}`,
    `C${slug(Number.isFinite(carat) ? String(carat) : config.centerDiamondSize)}`,
    `CS${slug(config.crownSetting)}`,
    `MC${slug(config.metal)}`,
  ].join("_");
}

/** Commerce variant SKU used by the reference cart payload. */
export function buildVariantSku(config: RingConfiguration): string {
  let sku = "DRCU0001";
  if (config.metal === "Yellow Gold") sku += "Y";
  else if (config.metal === "White Gold") sku += "W";
  else if (config.metal === "Rose Gold") sku += "R";
  sku += config.metalKarat === "14kt" ? "14" : "18";
  const caratCode: Record<string, string> = {
    "0.45": "F",
    "0.50": "F",
    "0.70": "H",
    "0.75": "H",
    "1.00": "K",
    "1.50": "M",
    "2.00": "O",
    "3.00": "R",
  };
  const n = Number(config.centerDiamondSize);
  sku += caratCode[Number.isFinite(n) ? n.toFixed(2) : ""] ?? "";
  sku += config.ringSize.padStart(2, "0");
  return sku;
}

export const VIEW_ORDER: ViewName[] = ["front", "side", "top", "angle"];

export function getRingAssets(config: RingConfiguration) {
  const previewSku = buildPreviewSku(config);
  return {
    previewSku,
    variantSku: buildVariantSku(config),
    views: getSnapshotUrls(previewSku, config.metal),
    models: getRingModelAssets(config),
  };
}

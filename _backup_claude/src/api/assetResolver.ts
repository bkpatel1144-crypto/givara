/**
 * Resolves Givara's own 3D ring assets.
 *
 * Set VITE_ASSET_BASE_URL to where the GLB files are hosted — "/models" for
 * files in public/models, or a CDN/bucket URL (which must send CORS headers).
 * When it is not set, the 3D viewer is skipped and the procedural ring
 * illustration is shown instead, so the builder is fully usable without assets.
 *
 * File convention (see public/models/README.md):
 *   {base}/head/{crownSetting}/{diamondShape}/{carat}ct.glb   e.g. head/hidden-halo/oval/1ct.glb
 *   {base}/shank/{ringStyle}/{sideSetting}.glb                e.g. shank/cathedral-straight/pave.glb
 *
 * Metal colour is applied at runtime to every material whose name does not
 * contain "diamond", "stone" or "gem", so one GLB serves all three metals.
 */
import type { RingConfiguration, RingModelAssets } from "@/types/ring";

export const ASSET_BASE_URL = (import.meta.env.VITE_ASSET_BASE_URL ?? "").replace(/\/+$/, "");

export const HAS_3D_ASSETS = ASSET_BASE_URL.length > 0;

export function getRingModelAssets(
  config: Pick<
    RingConfiguration,
    "crownSetting" | "diamondShape" | "centerDiamondSize" | "ringStyle" | "sideSetting"
  >,
): RingModelAssets | null {
  if (!HAS_3D_ASSETS) return null;
  const path = (...segments: string[]) =>
    `${ASSET_BASE_URL}/${segments.map(encodeURIComponent).join("/")}`;

  return {
    headPath: path(
      "head",
      config.crownSetting,
      config.diamondShape,
      `${config.centerDiamondSize}ct.glb`,
    ),
    shankPath: path("shank", config.ringStyle, `${config.sideSetting}.glb`),
  };
}

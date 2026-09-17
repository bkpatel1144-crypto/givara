export type DiamondShape =
  | "round"
  | "princess"
  | "oval"
  | "pear"
  | "emerald"
  | "radiant"
  | "marquise"
  | "heart"
  | "elongated-cushion";

export type RingStyle =
  "classic-straight" | "cathedral-straight" | "twist" | "split" | "two-row-split" | "pinch";

export type SideSetting = "plain-gold" | "pave" | "prong" | "channel";

export type CrownSetting = "classic" | "hidden-halo" | "single-halo";

export type Metal = "White Gold" | "Yellow Gold" | "Rose Gold";

export type MetalKarat = "14kt" | "18kt";

export type Carat = "0.5" | "0.75" | "1" | "1.5" | "2" | "3";

export interface RingConfiguration {
  diamondShape: DiamondShape;
  centerDiamondSize: Carat;
  crownSetting: CrownSetting;
  ringStyle: RingStyle;
  sideSetting: SideSetting;
  metal: Metal;
  metalKarat: MetalKarat;
  ringSize: string;
  engravingText: string;
}

export type ViewName = "front" | "side" | "top" | "angle";

export interface SnapshotViews {
  front: string;
  side: string;
  top: string;
  angle: string;
}

export interface RingModelAssets {
  diamondPath: string;
  headPath: string;
  /** null when the head has no halo stones (crownSetting "classic"). */
  headDiamondPath: string | null;
  bandPath: string;
  /** null when the band has no pave (sideSetting "plain-gold"). */
  bandDiamondPath: string | null;
}

export interface CartItem {
  id: string;
  createdAt: string;
  title: string;
  configuration: RingConfiguration;
  selections: Record<string, string>;
  engravingText: string;
  totalPrice: number | null;
  priceBreakup: unknown;
  assets: SnapshotViews;
}

export interface PriceBreakdown {
  shankGold: number;
  headGold: number;
  shankMaking: number;
  headMaking: number;
  centerDiamond: number;
  headSideDiamond: number;
  shankSideDiamond: number;
}

export interface GoldBreakup {
  shankWeight: number;
  headWeight: number;
  weight: number;
  rate: number;
  value: number;
}

export interface DiamondLine {
  shape: string;
  quality: string;
  qty: number;
  weight: number;
  price: number;
}

export interface DiamondBreakup {
  centerDiamond: DiamondLine;
  headSideDiamond: DiamondLine;
  shankSideDiamond: DiamondLine;
  totalPrice: number;
}

export interface MakingCharges {
  shank: number;
  head: number;
  total: number;
}

export interface PriceData {
  breakdown: PriceBreakdown;
  goldBreakup: GoldBreakup;
  diamondBreakup: DiamondBreakup;
  makingCharges: MakingCharges;
  subtotal: number;
  gst: number;
  total: number;
}

export interface CalculatePriceResponse {
  status: "success" | "error";
  data: PriceData;
}

export interface CalculatePriceRequest {
  diamondShape: string;
  centerDiamondSize: number;
  crownSetting: string;
  ringStyle: string;
  sideSetting: string;
  metalKarat: string;
  ringSize: string;
}

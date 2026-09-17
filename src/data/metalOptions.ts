import type { Metal } from "@/types/ring";
import type { Option } from "./ringOptions";

export interface MetalOption extends Option<Metal> {
  swatch: string;
}

export const METALS: MetalOption[] = [
  {
    value: "White Gold",
    label: "White",
    swatch: "linear-gradient(145deg,#f5f5f5,#c9cacd 55%,#e9eaec)",
  },
  {
    value: "Yellow Gold",
    label: "Yellow Gold",
    swatch: "linear-gradient(145deg,#f7e2a8,#e4c264 55%,#f3dda1)",
  },
  {
    value: "Rose Gold",
    label: "Rose Gold",
    swatch: "linear-gradient(145deg,#fbd8c6,#f0b195 55%,#f9d3bf)",
  },
];

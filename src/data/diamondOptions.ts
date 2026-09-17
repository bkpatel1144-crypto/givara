import type { Carat, DiamondShape } from "@/types/ring";
import type { Option } from "./ringOptions";

export const DIAMOND_SHAPES: Option<DiamondShape>[] = [
  { value: "round", label: "Round" },
  { value: "princess", label: "Princess" },
  { value: "oval", label: "Oval" },
  { value: "pear", label: "Pear" },
  { value: "emerald", label: "Emerald" },
  { value: "radiant", label: "Radiant" },
  { value: "marquise", label: "Marquise" },
  { value: "heart", label: "Heart" },
  { value: "elongated-cushion", label: "Elongated Cushion" },
];

export const CARAT_STEPS: { value: Carat; label: string }[] = [
  { value: "0.5", label: "0.50 CT" },
  { value: "0.75", label: "0.75 CT" },
  { value: "1", label: "1.00 CT" },
  { value: "1.5", label: "1.50 CT" },
  { value: "2", label: "2.00 CT" },
  { value: "3", label: "3.00 CT" },
];

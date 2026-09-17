/**
 * International ring size conversion.
 *
 * Sizes are stored canonically as US sizes. Every other system is derived from
 * the ring's inner diameter / circumference so the conversions stay consistent:
 *   inner diameter (mm) = 11.63 + 0.8128 × US size
 *   EU / ISO 8653       = inner circumference in mm
 *   UK / AU letters     = A at 37.8 mm circumference, +1.25 mm per letter (half steps)
 *   India               = inner circumference − 40 mm
 * Charts vary slightly between jewellers; these are the widely used approximations.
 */

export type RingSizeSystem = "US" | "UK" | "EU" | "IN";

const MIN_US = 3;
const MAX_US = 13;

/** US sizes 3 … 13 in half steps. */
export const RING_SIZES: string[] = Array.from({ length: (MAX_US - MIN_US) * 2 + 1 }, (_, i) =>
  String(MIN_US + i / 2),
);

export function innerDiameterMm(usSize: number): number {
  return 11.63 + 0.8128 * usSize;
}

export function innerCircumferenceMm(usSize: number): number {
  return Math.PI * innerDiameterMm(usSize);
}

const UK_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function ukSize(circumference: number): string {
  const steps = Math.round(((circumference - 37.8) / 1.25) * 2) / 2;
  const whole = Math.floor(steps);
  const half = steps - whole >= 0.5 ? "½" : "";
  if (whole < 0) return "A";
  if (whole >= UK_LETTERS.length) return `Z+${whole - UK_LETTERS.length + 1}${half}`;
  return `${UK_LETTERS[whole]}${half}`;
}

function formatUs(usSize: number): string {
  const whole = Math.floor(usSize);
  return usSize - whole === 0.5 ? `${whole}½` : String(whole);
}

export function convertRingSize(usSize: string, system: RingSizeSystem): string {
  const us = Number(usSize);
  if (!Number.isFinite(us)) return usSize;
  const circumference = innerCircumferenceMm(us);
  switch (system) {
    case "US":
      return formatUs(us);
    case "UK":
      return ukSize(circumference);
    case "EU":
      return String(Math.round(circumference));
    case "IN":
      return String(Math.max(1, Math.round(circumference - 40)));
  }
}

export function ringSizeLabel(usSize: string, system: RingSizeSystem): string {
  return `${system} ${convertRingSize(usSize, system)}`;
}

/** e.g. "US 7 · UK N½ · EU 54 · Ø 17.3 mm" */
export function ringSizeEquivalents(usSize: string): string {
  const us = Number(usSize);
  if (!Number.isFinite(us)) return "";
  return [
    ringSizeLabel(usSize, "US"),
    ringSizeLabel(usSize, "UK"),
    ringSizeLabel(usSize, "EU"),
    `Ø ${innerDiameterMm(us).toFixed(1)} mm`,
  ].join(" · ");
}

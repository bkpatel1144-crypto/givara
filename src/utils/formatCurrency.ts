export function formatINR(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function formatDecimal(value: number, digits = 3): string {
  return Number(value).toFixed(digits).replace(/\.?0+$/, "");
}

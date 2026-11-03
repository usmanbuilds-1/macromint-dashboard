import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Round to a fixed number of decimals, half away from zero. */
export function roundTo(value: number, decimals = 0): number {
  if (!Number.isFinite(value)) return value;
  const factor = Math.pow(10, decimals);
  const shifted = value * factor;
  // Number.EPSILON correction avoids float artifacts like 1.005 → 1 (when ×100 gives 100.49999…).
  const rounded = Math.round(Math.abs(shifted) + Number.EPSILON * Math.abs(shifted)) * Math.sign(shifted);
  return rounded / factor;
}

/** Human-friendly number: rounded to `decimals` (default 0) with thousands separators. */
export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  return roundTo(value, decimals).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

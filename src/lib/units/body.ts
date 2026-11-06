/** Display-only unit conversions. All persisted values and calorie calculations
 * remain metric (cm and kg). No conversion changes the energy equation. */
const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;
const round = (value: number, digits: number) =>
  Math.round(value * 10 ** digits) / 10 ** digits;

export function cmToFeetInches(cm: number): { feet: string; inches: string } {
  if (!Number.isFinite(cm) || cm <= 0) return { feet: "", inches: "" };
  const tenths = Math.round((cm / CM_PER_INCH) * 10);
  const feet = Math.floor(tenths / 120);
  return { feet: String(feet), inches: String((tenths - feet * 120) / 10) };
}

export function feetInchesToCm(feet: string, inches: string): number | null {
  if (feet.trim() === "" || inches.trim() === "") return null;
  const ft = Number(feet), inch = Number(inches);
  if (!Number.isInteger(ft) || ft < 0 ||
      !Number.isFinite(inch) || inch < 0 || inch >= 12) return null;
  return round((ft * 12 + inch) * CM_PER_INCH, 3);
}

export function kgToLb(kg: number): string {
  return Number.isFinite(kg) && kg > 0 ? String(round(kg / KG_PER_LB, 1)) : "";
}

export function lbToKg(value: string): number | null {
  if (value.trim() === "") return null;
  const lb = Number(value);
  return Number.isFinite(lb) && lb > 0 ? round(lb * KG_PER_LB, 3) : null;
}

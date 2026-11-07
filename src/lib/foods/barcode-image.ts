/** Browser-native image barcode decoding. Never uploads or stores the image.
 * BarcodeDetector is not supported by every browser; return an explicit
 * unsupported outcome and keep manual numeric input available. */
export type BarcodeDecode = { kind: "found"; code: string } |
  { kind: "unsupported" | "no-match"; code?: never };
type Detection = { rawValue: string; format: string };
type Detector = { detect(image: ImageBitmap): Promise<Detection[]> };
type DetectorCtor = {
  new(options: { formats: string[] }): Detector;
  getSupportedFormats(): Promise<string[]>;
};
export function normalizeProductBarcode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim();
  return /^\d{6,20}$/.test(code) ? code : null;
}
export async function decodeBarcodeImage(
  file: File,
  api: { detector?: DetectorCtor; createBitmap?: typeof createImageBitmap } = {},
): Promise<BarcodeDecode> {
  if (!file.type.startsWith("image/") || file.size <= 0 || file.size > 8_000_000)
    throw new RangeError("Choose an image smaller than 8 MB");
  const Detector = api.detector ?? (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  const createBitmap = api.createBitmap ?? globalThis.createImageBitmap;
  if (!Detector || !createBitmap) return { kind: "unsupported" };
  const supported = await Detector.getSupportedFormats().catch(() => [] as string[]);
  const formats = ["ean_13", "ean_8", "upc_a", "upc_e"].filter((format) => supported.includes(format));
  if (!formats.length) return { kind: "unsupported" };
  const bitmap = await createBitmap(file);
  try {
    const detections = await new Detector({ formats }).detect(bitmap);
    for (const match of detections) {
      const code = normalizeProductBarcode(match.rawValue);
      if (code && formats.includes(match.format)) return { kind: "found", code };
    }
    return { kind: "no-match" };
  } finally {
    bitmap.close();
  }
}

import { describe, expect, it, vi } from "vitest";
import { decodeBarcodeImage, normalizeProductBarcode } from "./barcode-image";
describe("barcode image decoding", () => {
  it("accepts real digits without stripping leading zeros", () => {
    expect(normalizeProductBarcode(" 000123456789 ")).toBe("000123456789");
    expect(normalizeProductBarcode("123 456")).toBeNull();
    expect(normalizeProductBarcode("abc12345")).toBeNull();
  });
  it("rejects oversized files before opening any camera API", async () => {
    const oversized = new File(["a"], "x.png", { type: "image/png" });
    Object.defineProperty(oversized, "size", { value: 9_000_000 });
    await expect(decodeBarcodeImage(oversized)).rejects.toThrow(/8 MB/);
  });
  it("returns unsupported instead of misreporting a barcode match", async () => {
    const file = new File(["img"], "x.png", { type: "image/png" });
    expect(await decodeBarcodeImage(file, { detector: undefined, createBitmap: undefined })).toEqual({ kind:"unsupported" });
  });
  it("closes decoded bitmap even on detector errors", async () => {
    const close = vi.fn();
    const bitmap = { close } as unknown as ImageBitmap;
    class Detector { static async getSupportedFormats(){ return ["ean_13"]; } async detect(){ throw Error("decode failed"); } }
    const file = new File(["img"], "x.png", { type: "image/png" });
    await expect(decodeBarcodeImage(file, { detector: Detector as never, createBitmap: async () => bitmap })).rejects.toThrow();
    expect(close).toHaveBeenCalledOnce();
  });
});

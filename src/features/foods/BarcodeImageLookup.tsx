import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { decodeBarcodeImage } from "@/lib/foods/barcode-image";
import { toast } from "sonner";

/** No live streaming, persistence or third-party upload. Opens the camera's
 * native image capture on phones; existing manual numeric lookup is fallback. */
export function BarcodeImageLookup({ onCode }: { onCode: (code: string) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const select = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    try {
      const result = await decodeBarcodeImage(file);
      if (result.kind === "found") await onCode(result.code);
      else toast.info(result.kind === "unsupported"
        ? "Barcode reading isn't supported here. Enter the numbers printed beneath the barcode."
        : "No readable barcode found. Try another image or enter the digits.");
    } catch {
      toast.error("Could not read the image. Try a clear barcode under 8 MB, or type the digits.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <>
      <input ref={input} type="file" className="sr-only" accept="image/*" capture="environment"
        aria-label="Barcode image" onChange={(event) => { void select(event.target.files?.[0]); }} />
      <button type="button" className="mm-barcode-capture" disabled={busy}
        onClick={() => input.current?.click()}>
        <Camera className="h-4 w-4" aria-hidden="true" />
        {busy ? "Reading barcode…" : "Scan packaging barcode"}
      </button>
    </>
  );
}

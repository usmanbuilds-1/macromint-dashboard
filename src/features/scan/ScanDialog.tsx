import { LIMITS } from "@/lib/validation/limits";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanError, friendlyScanError, prepareImage, scanImage, type ScanResponse } from "@/lib/scan/client";
import { groundScanItems, type RawModelItem } from "@/lib/scan/grounding";
import { backend, bumpData } from "@/lib/backend";
import type { MealType, ScanItem } from "@/types";
import { ScanCapture } from "./ScanCapture";
import { ScanReview } from "./ScanReview";
import { useFoodLog } from "@/features/foods/FoodLogProvider";
import { useMobileDialogViewport } from "@/hooks/useMobileDialogViewport";

type Phase = "capture" | "scanning" | "review";

export function ScanDialog({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: { entryDate: string; mealType: string } | null;
  onClose: () => void;
}) {
  const cameraButtonRef = useRef<HTMLButtonElement>(null);
  const sheetStyle = useMobileDialogViewport(open);
  const foodLog = useFoodLog();
  const originalItems = useRef<ScanItem[]>([]);
  const saving = useRef(false);
  const [gramDrafts, setGramDrafts] = useState<Record<number, string>>({});
  const [phase, setPhase] = useState<Phase>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [hints, setHints] = useState("");
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [items, setItems] = useState<ScanItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPhase("capture");
    setPreview(null);
    setHints("");
    setResult(null);
    setItems([]);
    originalItems.current = [];
    setGramDrafts({});
    setError(null);
  };

  const handleFile = async (file: File) => {
    reset();
    try {
      const dataUrl = await prepareImage(file);
      setPreview(dataUrl);
      setPhase("scanning");
      const res = await scanImage(dataUrl, hints);
      // Demo/local mode returns raw model items: ground them client-side
      // against the demo food database (production grounds server-side).
      let items = res.items as ScanItem[];
      if (items[0] && !("grounding" in items[0])) {
        const foods = (await backend.getAllFoods?.()) ?? [];
        items = await groundScanItems(res.items as unknown as RawModelItem[], foods);
      }
      setResult(res);
      originalItems.current = items.map((i) => ({ ...i, nutrients: { ...i.nutrients } }));
      setItems(items.map((i) => ({ ...i, nutrients: { ...i.nutrients } })));
      setPhase("review");
    } catch (e) {
      const code = e instanceof ScanError ? e.code : "AI_FAILED";
      setError(friendlyScanError(code));
      setPhase("capture");
    }
  };

  const addAll = async () => {
    if (!target || saving.current || items.length === 0) return;
    saving.current = true;
    setPhase("scanning");
    const writtenIds: string[] = [];
    try {
      const corrections: Array<{ label: string; original: unknown; corrected: unknown }> = [];
      for (const item of items) {
        const created = await backend.addEntry({
          entryDate: target.entryDate,
          mealType: target.mealType as never,
          foodId: item.matchedFoodId,
          name: item.label,
          brand: null,
          grams: item.grams,
          portionPercent: 100,
          baseNutrients: item.nutrients,
          source: "scan",
        });
        writtenIds.push(created.id);
        corrections.push({
          label: item.label,
          original: { grams: item.grams, kcal: item.nutrients.kcal ?? null },
          corrected: { grams: item.grams, kcal: item.nutrients.kcal ?? null, accepted: true },
        });
      }
      await backend.reportScanCorrections("scan-" + Date.now(), corrections).catch(() => undefined);
      bumpData();
      toast.success(`${items.length} item${items.length === 1 ? "" : "s"} added to your diary.`);
      onClose();
      reset();
    } catch {
      // Compensate for a partial multi-item write. The backend's addEntry
      // method is not atomic across items; never blindly retry duplicates.
      const cleanup = await Promise.allSettled(writtenIds.map((id) => backend.deleteEntry(id)));
      const cleanupFailed = cleanup.some((entry) => entry.status === "rejected");
      bumpData();
      if (cleanupFailed) {
        toast.error("Some items may be in your diary. Review the diary before scanning again.");
        onClose();
        reset();
      } else {
        toast.error("Could not add the scanned items. Nothing was saved; please retry.");
        setPhase("review");
      }
    } finally {
      saving.current = false;
    }
  };

  if (!open) return null;

  const invalidGramDraft = Object.values(gramDrafts).some((draft) => !Number.isSafeInteger(Number(draft)) || Number(draft) < 1 || Number(draft) > LIMITS.foodGrams.max || draft.length === 0);


  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="mm-scan-dialog max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-lg"
        style={sheetStyle}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => {
          // Radix otherwise focuses the notes input and opens the phone
          // keyboard on a screen whose main action is selecting a photo.
          event.preventDefault();
          cameraButtonRef.current?.focus({ preventScroll: true });
        }}>
        <DialogHeader>
          <DialogTitle>Add food from a photo</DialogTitle>
          <DialogDescription>
            Take or upload a photo. Check estimated foods before saving.
          </DialogDescription>
        </DialogHeader>

        {phase === "capture" && (
          <ScanCapture
            cameraButtonRef={cameraButtonRef}
            hints={hints}
            setHints={setHints}
            onFile={(file) => { void handleFile(file); }}
            onSearchText={() => {
              if (!target) return;
              onClose();
              reset();
              foodLog.openSearch({ entryDate: target.entryDate, mealType: target.mealType as MealType });
            }}
            error={error}
          />
        )}

        {phase === "scanning" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Analysing your photo</p>
              <p className="mt-1 text-xs text-muted-foreground">Identifying items, estimating portions, matching the food database</p>
            </div>
          </div>
        )}

        {phase === "review" && result && (
          <ScanReview result={result} items={items} preview={preview}
            gramDrafts={gramDrafts} setGramDrafts={setGramDrafts}
            setItems={setItems} originalItems={originalItems} />
        )}

        {phase === "review" && <DialogFooter className="mt-1 gap-2 sm:justify-between">
          <Button variant="ghost" onClick={reset}>Try another photo</Button>
          {phase === "review" && items.length > 0 && (
            <Button onClick={addAll} disabled={invalidGramDraft}>Add {items.length} item{items.length === 1 ? "" : "s"} to diary</Button>
          )}
        </DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

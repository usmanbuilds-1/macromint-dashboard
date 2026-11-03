import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Info, Loader2, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScanError, friendlyScanError, prepareImage, scanImage, type ScanResponse } from "@/lib/scan/client";
import { groundScanItems, type RawModelItem } from "@/lib/scan/grounding";
import { backend, bumpData } from "@/lib/backend";
import { checkPlausibility } from "@/lib/nutrition/math";
import { kcalOf } from "@/components/app/bits";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ScanItem } from "@/types";

type Phase = "capture" | "scanning" | "review";

function ConfidenceBadge({ level }: { level: "low" | "medium" | "high" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px]",
        level === "high" && "border-primary/40 text-primary",
        level === "medium" && "border-warning/40 text-warning",
        level === "low" && "border-destructive/40 text-destructive",
      )}
    >
      {level} confidence
    </Badge>
  );
}

export function ScanDialog({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: { entryDate: string; mealType: string } | null;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
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
      setItems(items.map((i) => ({ ...i })));
      setPhase("review");
    } catch (e) {
      const code = e instanceof ScanError ? e.code : "AI_FAILED";
      setError(friendlyScanError(code));
      setPhase("capture");
    }
  };

  const addAll = async () => {
    if (!target) return;
    setPhase("scanning");
    try {
      const corrections: Array<{ label: string; original: unknown; corrected: unknown }> = [];
      for (const item of items) {
        await backend.addEntry({
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
        corrections.push({
          label: item.label,
          original: { grams: item.grams, kcal: item.nutrients.kcal ?? null },
          corrected: { grams: item.grams, kcal: item.nutrients.kcal ?? null, accepted: true },
        });
      }
      await backend.reportScanCorrections("scan-" + Date.now(), corrections).catch(() => undefined);
      bumpData();
      toast.success(`${items.length} item${items.length === 1 ? "" : "s"} added to your diary. Review them below — you can adjust portions any time.`);
      onClose();
      reset();
    } catch {
      toast.error("Could not add the scanned items");
      setPhase("review");
    }
  };

  if (!open) return null;

  const totalKcal = items.reduce((s, i) => s + kcalOf(i.nutrients), 0);

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan a meal</DialogTitle>
          <DialogDescription>
            Photograph your plate. Every item is checked against the verified food database, validated for consistency, and shown to you for review before anything is logged.
          </DialogDescription>
        </DialogHeader>

        {phase === "capture" && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="scan-hints">Optional notes (e.g. "small plate, no oil")</Label>
              <Input
                id="scan-hints"
                value={hints}
                onChange={(e) => setHints(e.target.value)}
                placeholder="Anything the camera cannot see"
              />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-8 text-center transition-colors hover:border-primary/60 hover:bg-accent/40"
            >
              <Camera className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Take a photo or choose an image</span>
              <span className="text-xs text-muted-foreground">JPEG or PNG. Fill the frame, include everything on the plate.</span>
            </button>
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
          </div>
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
          <div className="flex flex-col gap-4">
            {preview && (
              <img src={preview} alt="Scanned meal" className="h-36 w-full rounded-md border object-cover" />
            )}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ConfidenceBadge level={result.overallConfidence} />
                {items.some((i) => i.grounding === "db") && (
                  <Badge variant="outline" className="text-[11px] text-muted-foreground">
                    <Info className="mr-1 h-3 w-3" /> Database-grounded
                  </Badge>
                )}
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">≈ {formatNumber(totalKcal)} kcal total</span>
            </div>

            {items.length === 0 ? (
              <p className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
                No food was recognised in this photo. Try again with the plate fully in frame.
              </p>
            ) : (
              <div className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
                {items.map((item, idx) => {
                  const plausibility = checkPlausibility(item.nutrients);
                  return (
                    <div key={idx} className="rounded-lg border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.label}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {item.grounding === "db" ? "Database match" : "AI estimate"}
                            </Badge>
                            <ConfidenceBadge level={item.confidence} />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums">{formatNumber(kcalOf(item.nutrients))}</p>
                          <p className="text-[11px] text-muted-foreground">kcal</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <Label htmlFor={`grams-${idx}`} className="text-xs text-muted-foreground">Grams</Label>
                        <Input
                          id={`grams-${idx}`}
                          inputMode="numeric"
                          className="h-8 w-24 text-sm tabular-nums"
                          value={item.grams}
                          onChange={(e) => {
                            const grams = Math.max(Number(e.target.value.replace(/\D/g, "")) || 0, 1);
                            setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, grams } : it)));
                          }}
                        />
                        <span className="text-xs tabular-nums text-muted-foreground">
                          P {formatNumber(item.nutrients.protein ?? 0)} · C {formatNumber(item.nutrients.carbs ?? 0)} · F {formatNumber(item.nutrients.fat ?? 0)}
                        </span>
                      </div>
                      {(!plausibility.ok || item.warnings.length > 0) && (
                        <ul className="mt-2.5 flex flex-col gap-1">
                          {[...item.warnings, ...plausibility.issues].map((w, wi) => (
                            <li key={wi} className="flex items-start gap-1.5 text-xs text-warning">
                              <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" /> {w}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {result.attribution && <p className="text-[11px] text-muted-foreground/70">{result.attribution}</p>}
          </div>
        )}

        <DialogFooter className="mt-1 gap-2 sm:justify-between">
          <Button variant="ghost" onClick={reset} disabled={phase === "scanning"}>
            {phase === "review" ? "Scan another" : "Back"}
          </Button>
          {phase === "review" && items.length > 0 && (
            <Button onClick={addAll}>Add {items.length} item{items.length === 1 ? "" : "s"} to diary</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

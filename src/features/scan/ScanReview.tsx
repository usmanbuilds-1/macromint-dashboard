import { type Dispatch, type RefObject, type SetStateAction } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LIMITS } from "@/lib/validation/limits";
import { checkPlausibility, rescaleScanNutrients } from "@/lib/nutrition/math";
import { kcalOf } from "@/components/app/bits";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ScanItem } from "@/types";
import type { ScanResponse } from "@/lib/scan/client";

function ConfidenceBadge({ level }: { level: "low" | "medium" | "high" }) {
  return (
    <Badge variant="outline" className={cn("text-xs",
      level === "high" && "border-primary/40 text-primary",
      level === "medium" && "border-warning/40 text-warning",
      level === "low" && "border-destructive/40 text-destructive")}>
      {level} confidence
    </Badge>
  );
}

/** Review a scan without ever silently treating estimates as measured facts. */
export function ScanReview({
  result, items, preview, gramDrafts, setGramDrafts, setItems, originalItems,
}: {
  result: ScanResponse;
  items: ScanItem[];
  preview: string | null;
  gramDrafts: Record<number, string>;
  setGramDrafts: Dispatch<SetStateAction<Record<number, string>>>;
  setItems: Dispatch<SetStateAction<ScanItem[]>>;
  originalItems: RefObject<ScanItem[]>;
}) {
  const totalKcal = items.reduce((sum, item) => sum + kcalOf(item.nutrients), 0);
  return (
    <div className="flex flex-col gap-4">
      {preview && (
        <img src={preview} alt="The selected meal photo" width={640} height={240}
          className="h-40 w-full rounded-lg border object-cover" />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ConfidenceBadge level={result.overallConfidence} />
          {items.some((item) => item.grounding === "db") && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              <Info className="mr-1 h-3 w-3" /> Database match
            </Badge>
          )}
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          ≈ {formatNumber(totalKcal)} kcal estimated
        </span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border px-4 py-6 text-center text-sm text-muted-foreground">
          We couldn't recognise food in this picture. Try another with the whole meal visible.
        </p>
      ) : (
        <div className="flex max-h-[44dvh] flex-col gap-3 overflow-y-auto pr-1" aria-label="Review estimated foods">
          {items.map((item, idx) => {
            const plausibility = checkPlausibility(item.nutrients);
            return (
              <div key={idx} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {item.grounding === "db" ? "Database match" : "AI estimate"}
                      </Badge>
                      <ConfidenceBadge level={item.confidence} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold tabular-nums">
                      {formatNumber(kcalOf(item.nutrients))} <span className="text-xs font-normal">kcal</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                  <Label htmlFor={`grams-${idx}`} className="text-sm text-muted-foreground">
                    Portion (g)
                  </Label>
                  <Input id={`grams-${idx}`} type="number" min={1}
                    max={LIMITS.foodGrams.max} step={1} inputMode="numeric"
                    className="h-11 w-24 text-sm tabular-nums"
                    value={gramDrafts[idx] ?? String(item.grams)}
                    aria-describedby={`grams-help-${idx}`}
                    onChange={(event) => {
                      const draft = event.target.value.replace(/[^0-9]/g, "");
                      setGramDrafts((prev) => ({ ...prev, [idx]: draft }));
                      const grams = Number(draft);
                      const original = originalItems.current[idx];
                      if (!original || !Number.isSafeInteger(grams) ||
                          grams < 1 || grams > LIMITS.foodGrams.max) return;
                      setItems((prev) => prev.map((current, i) =>
                        i === idx
                          ? { ...current, grams,
                            nutrients: rescaleScanNutrients(original.nutrients, original.grams, grams) }
                          : current,
                      ));
                    }}
                    onBlur={() => setGramDrafts((prev) => {
                      const next = { ...prev };
                      delete next[idx];
                      return next;
                    })}
                  />
                  <span id={`grams-help-${idx}`} className="text-xs tabular-nums text-muted-foreground">
                    Protein {formatNumber(item.nutrients.protein ?? 0)} g · Carbs {formatNumber(item.nutrients.carbs ?? 0)} g · Fat {formatNumber(item.nutrients.fat ?? 0)} g
                  </span>
                </div>
                {(!plausibility.ok || item.warnings.length > 0) && (
                  <ul className="mt-3 space-y-1" aria-label="Scan review warnings">
                    {[...item.warnings, ...plausibility.issues].map((warning, warningIndex) => (
                      <li key={warningIndex} className="flex items-start gap-1.5 text-xs leading-5 text-warning">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {warning}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
      {result.attribution && <p className="text-xs text-muted-foreground">{result.attribution}</p>}
    </div>
  );
}

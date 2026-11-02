import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MEAL_LABELS, MEAL_TYPES, type DiaryEntry, type MealType, type NutrientRecord } from "@/types";
import { backend, bumpData, BackendError } from "@/lib/backend";
import { scaleNutrients, applyPortionPercent } from "@/lib/nutrition/math";
import { kcalOf } from "@/components/app/bits";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { FoodLogTarget, LoggableFood } from "./FoodLogProvider";

const PORTION_PRESETS = [25, 50, 75, 100];

function NutrientPreview({ label, value, unit, emphasize }: { label: string; value: number | null; unit: string; emphasize?: boolean }) {
  return (
    <div className="text-center">
      <p className={cn("text-lg font-semibold tabular-nums", emphasize && "text-primary")}>
        {value == null ? "—" : formatNumber(value, unit === "g" ? 1 : 0)}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {label} <span className="opacity-60">{unit}</span>
      </p>
    </div>
  );
}

export function ServingConfigDialog({
  food,
  target,
  onClose,
  entry,
}: {
  food: LoggableFood | null;
  target: FoodLogTarget | null;
  onClose: () => void;
  /** Fetched when target.editEntryId is set (edit mode without a food object). */
  entry: DiaryEntry | null;
}) {
  const editing = Boolean(target?.editEntryId);
  const view = useMemo<LoggableFood | null>(() => {
    if (food) return food;
    if (entry) {
      const factor = Math.max(entry.grams, 1) / 100;
      const per100: NutrientRecord = {};
      for (const [k, v] of Object.entries(entry.baseNutrients) as [string, number | null][]) {
        per100[k as keyof NutrientRecord] = v == null ? null : Math.round((v / factor) * 10) / 10;
      }
      return {
        foodId: entry.foodId,
        name: entry.name,
        brand: entry.brand,
        per100g: per100,
        servingLabel: "100 g",
        servingGrams: 100,
        verified: true,
        sourceLabel: "Diary entry",
      };
    }
    return null;
  }, [food, entry]);

  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [grams, setGrams] = useState("100");
  const [pct, setPct] = useState(100);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!view || !target) return;
    setMealType(target.mealType);
    if (entry) {
      setGrams(String(entry.grams));
      setPct(entry.portionPercent);
    } else {
      setGrams(String(view.servingGrams));
      setPct(100);
    }
  }, [view, target, entry]);

  const gramsNum = Math.max(Number(grams) || 0, 0);
  const base = useMemo(() => (view ? scaleNutrients(view.per100g, gramsNum, 100) : {}), [view, gramsNum]);
  const eaten = useMemo(() => (view ? applyPortionPercent(base, pct) : {}), [view, base, pct]);

  if (!view || !target) return null;

  const submit = async () => {
    if (gramsNum <= 0) {
      toast.error("Portion must be greater than zero");
      return;
    }
    setBusy(true);
    try {
      if (editing && target.editEntryId) {
        await backend.updateEntry(target.editEntryId, {
          grams: gramsNum,
          portionPercent: pct,
          mealType,
          baseNutrients: base,
        });
        toast.success("Entry updated");
      } else {
        await backend.addEntry({
          entryDate: target.entryDate,
          mealType,
          foodId: view.foodId,
          name: view.name,
          brand: view.brand,
          grams: gramsNum,
          portionPercent: pct,
          baseNutrients: base,
          source: "search",
        });
        const kcal = kcalOf(eaten);
        toast.success(
          pct === 100
            ? `${view.name} added to ${MEAL_LABELS[mealType].toLowerCase()}`
            : `${view.name} added: ${pct}% of ${formatNumber(gramsNum, 0)} g (${formatNumber(kcal)} kcal)`,
        );
      }
      bumpData();
      onClose();
    } catch (err) {
      if (err instanceof BackendError && err.code === "NO_ACCESS") {
        toast.error("Your access has expired. Renew it to keep logging.");
      } else {
        toast.error("Could not save the entry");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6">{editing ? "Edit entry" : view.name}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{view.brand ?? view.sourceLabel}</span>
            {!view.verified && <span className="text-warning">Unverified values</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Meal</Label>
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
              <SelectTrigger aria-label="Meal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((m) => (
                  <SelectItem key={m} value={m}>{MEAL_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="sc-grams">Amount (g)</Label>
              <Input id="sc-grams" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sc-serving">Standard serving</Label>
              <Button
                type="button"
                variant="outline"
                className="justify-start font-normal"
                onClick={() => setGrams(String(view.servingGrams))}
              >
                {view.servingLabel}
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="sc-pct">Portion eaten</Label>
              <span className="text-xs text-muted-foreground">{pct}% of the amount above</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1.5">
                {PORTION_PRESETS.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={pct === p ? "default" : "outline"}
                    className="flex-1 tabular-nums"
                    onClick={() => setPct(p)}
                  >
                    {p}%
                  </Button>
                ))}
              </div>
              <Input
                id="sc-pct"
                inputMode="numeric"
                className="w-20 text-center tabular-nums"
                value={pct}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(/\D/g, ""));
                  setPct(Math.min(Math.max(v || 0, 1), 100));
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Log part of the portion — for example 70% of a 500 kcal dish records 350 kcal.
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-4 gap-2">
            <NutrientPreview label="Calories" value={eaten.kcal ?? null} unit="kcal" emphasize />
            <NutrientPreview label="Protein" value={eaten.protein ?? null} unit="g" />
            <NutrientPreview label="Carbs" value={eaten.carbs ?? null} unit="g" />
            <NutrientPreview label="Fat" value={eaten.fat ?? null} unit="g" />
          </div>
          {pct < 100 && (
            <p className="text-center text-xs text-muted-foreground">
              Full amount: {formatNumber(kcalOf(base))} kcal
            </p>
          )}
        </div>

        <DialogFooter className="mt-1 gap-2 sm:justify-between">
          {editing ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={async () => {
                if (!target.editEntryId) return;
                await backend.deleteEntry(target.editEntryId).catch(() => toast.error("Delete failed"));
                bumpData();
                toast("Entry deleted", {
                  action: { label: "Undo", onClick: async () => {
                    await backend.addEntry({
                      entryDate: entry?.entryDate ?? target.entryDate,
                      mealType: entry?.mealType ?? mealType,
                      foodId: entry?.foodId ?? view.foodId,
                      recipeId: entry?.recipeId ?? null,
                      name: entry?.name ?? view.name,
                      brand: entry?.brand ?? view.brand,
                      grams: entry?.grams ?? gramsNum,
                      portionPercent: entry?.portionPercent ?? pct,
                      baseNutrients: entry?.baseNutrients ?? base,
                      source: entry?.source ?? "search",
                    });
                    bumpData();
                  } },
                });
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add to diary"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, Star } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  MEAL_LABELS,
  MEAL_TYPES,
  type DiaryEntry,
  type MealType,
  type NutrientRecord,
} from "@/types";
import { backend, bumpData, BackendError } from "@/lib/backend";
import { scaleNutrients, applyPortionPercent } from "@/lib/nutrition/math";
import { kcalOf } from "@/components/app/bits";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { FoodLogTarget, LoggableFood } from "./FoodLogProvider";
import { LIMITS } from "@/lib/validation/limits";
import { useMobileDialogViewport } from "@/hooks/useMobileDialogViewport";
import { useAsyncData } from "@/hooks/useData";
import { matchingFavorite, toggleFavoriteCandidate } from "./favorite-actions";

const PORTION_PRESETS = [25, 50, 75, 100];

function NutrientPreview({
  label,
  value,
  unit,
  emphasize,
}: {
  label: string;
  value: number | null;
  unit: string;
  emphasize?: boolean;
}) {
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

  const dialogRef = useRef<HTMLDivElement>(null);
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [grams, setGrams] = useState("100");
  const [unit, setUnit] = useState("g");
  const [pct, setPct] = useState(100);
  const [customPortion, setCustomPortion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manualValues, setManualValues] = useState<Record<"kcal" | "protein" | "carbs" | "fat", string>>({
    kcal: "", protein: "", carbs: "", fat: "",
  });
  const quickAdd = Boolean(!editing && food && food.sourceLabel === "Quick add");
  const sheetStyle = useMobileDialogViewport(Boolean(view && target));
  useEffect(() => {
    if (!view || !target) return;
    setUnit("g");
    setMealType(target.mealType);
    setManualValues({ kcal: "", protein: "", carbs: "", fat: "" });
    if (entry) {
      setGrams(String(entry.grams));
      setPct(entry.portionPercent);
      setCustomPortion(!PORTION_PRESETS.includes(entry.portionPercent));
    } else {
      setGrams(String(view.servingGrams));
      setPct(100);
      setCustomPortion(false);
    }
  }, [view, target, entry]);

  const rawGrams = Number(grams);
  const gramsNum = rawGrams * (unit === "oz" ? 28.349523125 : 1);
  const invalidAmount = !grams.trim() || !Number.isFinite(gramsNum) ||
    gramsNum < LIMITS.foodGrams.min || gramsNum > LIMITS.foodGrams.max;
  const per100g = useMemo<NutrientRecord>(() => {
    if (!view) return {};
    if (!quickAdd) return view.per100g;
    const record: NutrientRecord = {};
    (["kcal", "protein", "carbs", "fat"] as const).forEach((key) => {
      const value = manualValues[key].trim();
      record[key] = value === "" ? null : Number(value);
    });
    return record;
  }, [view, quickAdd, manualValues]);
  const invalidManual = quickAdd && (
    manualValues.kcal.trim() === "" ||
    Object.entries(manualValues).some(([key, value]) => {
      if (value.trim() === "") return false;
      const numeric = Number(value);
      const bound = key === "kcal" ? LIMITS.foodKcalPer100g : LIMITS.foodMacroPer100g;
      return !Number.isFinite(numeric) || numeric < bound.min || numeric > bound.max;
    })
  );
  const base = useMemo(
    () => (view ? scaleNutrients(per100g, gramsNum, 100) : {}),
    [view, per100g, gramsNum],
  );
  const eaten = useMemo(() => (view ? applyPortionPercent(base, pct) : {}), [view, base, pct]);

  const favorites = useAsyncData(() => backend.getFavorites(), [], "favorites", Boolean(view && target));
  const candidate = view ? { ...view, per100g } : null;
  const isFavorite = Boolean(candidate && matchingFavorite(favorites.data ?? [], candidate));
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const favoriteCurrent = async () => {
    if (!candidate || favoriteBusy || (quickAdd && invalidManual)) return;
    setFavoriteBusy(true);
    try {
      const added = await toggleFavoriteCandidate(candidate, favorites.data ?? undefined);
      bumpData();
      toast.success(added ? "Added to favorites" : "Removed from favorites");
    } catch {
      toast.error("Could not update favorites");
    } finally {
      setFavoriteBusy(false);
    }
  };

  if (!view || !target) return null;

  const submit = async () => {
    if (invalidManual) {
      toast.error("Quick-add nutrition exceeds allowed per-100 g limits or is incomplete.");
      return;
    }
    if (invalidAmount) {
      toast.error(`Portion must be between ${LIMITS.foodGrams.min} and ${LIMITS.foodGrams.max} g.`);
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
      <DialogContent ref={dialogRef} className="max-h-[88dvh] overflow-y-auto sm:max-w-md"
        style={sheetStyle}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          dialogRef.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 pr-6">
            <DialogTitle className="min-w-0 flex-1">{editing ? "Edit entry" : view.name}</DialogTitle>
            {(!quickAdd || !invalidManual) && (
              <Button type="button" variant="ghost" size="icon"
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={isFavorite}
                disabled={favoriteBusy}
                onClick={() => { void favoriteCurrent(); }}>
                <Star aria-hidden="true" className={cn("h-5 w-5", isFavorite && "fill-primary text-primary")} />
              </Button>
            )}
          </div>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{view.brand ?? view.sourceLabel}</span>
            {!view.verified && <span className="text-warning">Unverified values</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {quickAdd && (
            <div className="border-b pb-4">
              <p className="text-sm font-semibold">Enter nutrition per 100 g</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Calories are required for quick add. Leave protein, carbs or fat empty when the amount is unknown; an empty value does not mean zero.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(["kcal", "protein", "carbs", "fat"] as const).map((key) => (
                  <div className="grid gap-1.5" key={key}>
                    <Label htmlFor={`quick-${key}`}>{key === "kcal" ? "Calories (kcal)" : `${key.charAt(0).toUpperCase() + key.slice(1)} (g)`}</Label>
                    <Input
                      id={`quick-${key}`} inputMode="decimal" type="number" step="any"
                      min={0} max={key === "kcal" ? LIMITS.foodKcalPer100g.max : LIMITS.foodMacroPer100g.max}
                      value={manualValues[key]}
                      onChange={(e) => setManualValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={key === "kcal" ? "Required" : "Unknown"}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label>Meal</Label>
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
              <SelectTrigger aria-label="Meal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MEAL_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="sc-grams">Amount ({unit})</Label>
              <Input
                id="sc-grams"
                type="number"
                min={unit === "oz" ? LIMITS.foodGrams.min / 28.349523125 : LIMITS.foodGrams.min}
                max={unit === "oz" ? LIMITS.foodGrams.max / 28.349523125 : LIMITS.foodGrams.max}
                step="any"
                inputMode="decimal"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sc-unit">Unit</Label>
              <select
                id="sc-unit"
                value={unit}
                onChange={(e) => {
                  const next = e.target.value;
                  setGrams(
                    String(Number((gramsNum / (next === "oz" ? 28.349523125 : 1)).toFixed(4))),
                  );
                  setUnit(next);
                }}
                className="rounded-md border bg-background p-2"
              >
                <option value="g">Grams</option>
                <option value="oz">Ounces</option>
              </select>
              <Button
                type="button"
                variant="outline"
                className="justify-start font-normal"
                onClick={() => {
                  setUnit("g");
                  setGrams(String(view.servingGrams));
                }}
              >
                {view.servingLabel}
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="sc-pct">Portion eaten</Label>
              <span className="text-xs text-muted-foreground">Choose a preset or enter your own</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1.5">
                {PORTION_PRESETS.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={!customPortion && pct === p ? "default" : "outline"}
                    className="flex-1 tabular-nums"
                    onClick={() => { setPct(p); setCustomPortion(false); }}
                  >
                    {p}%
                  </Button>
                ))}
              </div>
              <Button type="button" variant={customPortion ? "default" : "outline"}
                size="sm" onClick={() => setCustomPortion(true)}>Other</Button>
            </div>
            {customPortion && (
              <div className="flex items-center gap-2">
                <Input id="sc-pct" aria-label="Custom portion percentage"
                  type="number" min={1} max={100} step={1} inputMode="numeric"
                  className="w-24 text-center tabular-nums" value={pct}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isFinite(next)) setPct(Math.min(100, Math.max(1, Math.trunc(next))));
                  }} />
                <span className="text-sm text-muted-foreground">% eaten</span>
              </div>
            )}
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
                await backend
                  .deleteEntry(target.editEntryId)
                  .catch(() => toast.error("Delete failed"));
                bumpData();
                toast("Entry deleted", {
                  action: {
                    label: "Undo",
                    onClick: async () => {
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
                    },
                  },
                });
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy || invalidManual || invalidAmount}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add to diary"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

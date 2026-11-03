import { LIMITS, validateNumeric } from "@/lib/validation/limits";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, Plus, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { kcalOf } from "@/components/app/bits";
import { backend, bumpData } from "@/lib/backend";
import { useAsyncData, useDataVersion } from "@/hooks/useData";
import { todayStr } from "@/lib/nutrition/datetime";
import { foodToLoggable, offToLoggable, useFoodLog, type LoggableFood } from "./FoodLogProvider";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const MACRO_INPUTS = [
  { key: "kcal", label: "Calories (kcal)" },
  { key: "protein", label: "Protein (g)" },
  { key: "carbs", label: "Carbohydrates (g)" },
  { key: "fat", label: "Fat (g)" },
  { key: "fiber", label: "Fiber (g, optional)" },
  { key: "sugar", label: "Sugars (g, optional)" },
  { key: "sodium", label: "Sodium (mg, optional)" },
] as const;

function FoodRow({ food, onLog, favActive, onFav }: { food: LoggableFood; onLog: (f: LoggableFood) => void; favActive?: boolean; onFav?: () => void }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-4 py-3", "border-t first:border-t-0")}>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onLog(food)}>
        <p className="truncate text-sm font-medium">
          {food.name}
          {food.brand && <span className="font-normal text-muted-foreground"> · {food.brand}</span>}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{food.servingLabel}</span>
          <span className="tabular-nums">{formatNumber(kcalOf(food.per100g))} kcal per 100 g</span>
        </p>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <Badge variant={food.verified ? "outline" : "secondary"} className={cn("hidden text-[10px] sm:inline-flex", food.verified && "border-primary/40 text-primary")}>
          {food.sourceLabel}
        </Badge>
        {onFav && (
          <Button variant="ghost" size="icon" aria-label="Toggle favourite" onClick={onFav}>
            <Star className={cn("h-4 w-4", favActive && "fill-primary text-primary")} />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onLog(food)}>Log</Button>
      </div>
    </div>
  );
}

export function Foods() {
  const foodLog = useFoodLog();
  const version = useDataVersion();
  const [q, setQ] = useState("");
  const [hit, setHit] = useState<Awaited<ReturnType<typeof backend.searchFoods>> | null>(null);
  const [searching, setSearching] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const today = todayStr();

  const favorites = useAsyncData(() => backend.getFavorites(), [version]);

  const runSearch = async (term: string) => {
    if (term.trim().length < 2) {
      setHit(null);
      return;
    }
    setSearching(true);
    try {
      setHit(await backend.searchFoods(term.trim()));
    } catch {
      setHit({ local: [], remote: [], attribution: null, warning: "Search failed. Try again." });
    } finally {
      setSearching(false);
    }
  };

  const log = (food: LoggableFood) => {
    foodLog.open({ entryDate: today, mealType: "snacks", initialFood: food });
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Foods</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Search the database, reuse favourites, or add your own.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => foodLog.openScan({ entryDate: today, mealType: "snacks" })} className="gap-2">
            <Camera className="h-4 w-4" /> Scan
          </Button>
          <Button onClick={() => setCustomOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Custom food
          </Button>
        </div>
      </header>

      <Tabs defaultValue="search">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="favorites">Favourites</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-4 flex flex-col gap-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch(q);
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void runSearch(q)}
                placeholder="Chicken breast, biryani, branded products…"
                className="pl-9"
                aria-label="Search foods"
              />
            </div>
            <Button type="submit" disabled={searching}>{searching ? "Searching…" : "Search"}</Button>
          </form>

          {hit && (
            <div className="overflow-hidden rounded-xl border">
              {hit.local.length === 0 && hit.remote.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No matches for "{q}". You can create it as a custom food.
                </p>
              ) : (
                <>
                  {hit.local.map((food) => (
                    <FoodRow key={food.id} food={foodToLoggable(food)} onLog={log} />
                  ))}
                  {hit.remote.map((product, i) => (
                    <FoodRow key={`off-${i}`} food={offToLoggable(product)} onLog={log} />
                  ))}
                </>
              )}
              {hit.warning && <p className="border-t px-4 py-2 text-xs text-warning">{hit.warning}</p>}
              {hit.attribution && <p className="border-t px-4 py-2 text-[11px] text-muted-foreground/70">{hit.attribution}</p>}
            </div>
          )}
          {!hit && (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Results appear here. The verified database is searched first, then Open Food Facts for branded products.
            </p>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-4">
          <div className="overflow-hidden rounded-xl border">
            {favorites.data && favorites.data.length > 0 ? (
              favorites.data.map((fav) => (
                <FoodRow
                  key={fav.id}
                  food={foodToLoggable(fav.food)}
                  onLog={log}
                  favActive
                  onFav={async () => {
                    await backend.toggleFavorite(fav.foodId);
                    bumpData();
                  }}
                />
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No favourites yet. Tap the star on any food or diary entry to save it here for one-tap logging.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CustomFoodDialog open={customOpen} onClose={() => setCustomOpen(false)} onCreated={(food) => log(foodToLoggable(food))} />
    </div>
  );
}

function CustomFoodDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (food: Awaited<ReturnType<typeof backend.createCustomFood>>) => void }) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Give the food a name");
      return;
    }
    if (name.trim().length > 120 || brand.trim().length > 120) {
      toast.error("Food name and brand must be under 120 characters");
      return;
    }
    const kcalResult = validateNumeric(values["kcal"] ?? "", "foodKcalPer100g", "Calories");
    if ("error" in kcalResult) { toast.error(kcalResult.error); return; }
    const optionalKeys = ["protein", "carbs", "fat", "fiber", "sugar", "sodium"] as const;
    for (const key of optionalKeys) {
      const raw = values[key];
      if (raw === undefined || raw.trim() === "") continue;
      const result = validateNumeric(raw, key === "sodium" ? "foodKcalPer100g" : "foodMacroPer100g", key);
      if ("error" in result) { toast.error(result.error); return; }
    }
    const kcal = kcalResult.value;
    setBusy(true);
    try {
      const per100g: Record<string, number | null> = {
        kcal,
        protein: values["protein"]?.trim() ? Number(values["protein"]) : null,
        carbs: values["carbs"]?.trim() ? Number(values["carbs"]) : null,
        fat: values["fat"]?.trim() ? Number(values["fat"]) : null,
        fiber: values["fiber"] ? Number(values["fiber"]) : null,
        sugar: values["sugar"] ? Number(values["sugar"]) : null,
        sodium: values["sodium"] ? Number(values["sodium"]) : null,
      };
      const food = await backend.createCustomFood({
        name: name.trim(),
        brand: brand.trim() || null,
        per100g,
        servingLabel: "100 g",
        servingGrams: 100,
      });
      bumpData();
      toast.success("Custom food created");
      onClose();
      onCreated(food);
    } catch {
      toast.error("Could not create the food");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New custom food</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cf-name">Name</Label>
              <Input id="cf-name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Mum's biryani" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cf-brand">Brand (optional)</Label>
              <Input id="cf-brand" maxLength={120} value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Values per 100 g or 100 ml. Leave optional fields empty if unknown — Macromint never invents values.</p>
          <div className="grid grid-cols-2 gap-3">
            {MACRO_INPUTS.map((m) => (
              <div key={m.key} className="grid gap-1.5">
                <Label htmlFor={`cf-${m.key}`}>{m.label}</Label>
                <Input
                  id={`cf-${m.key}`}
                  type="number" min={0}
                  max={m.key === "kcal" || m.key === "sodium" ? LIMITS.foodKcalPer100g.max : LIMITS.foodMacroPer100g.max}
                  step="any" inputMode="decimal"
                  value={values[m.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [m.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Create and log"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

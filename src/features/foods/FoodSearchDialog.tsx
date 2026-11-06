import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Search, Star, Clock, Plus, Database, Barcode } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { MealType, NutrientRecord } from "@/types";
import { backend } from "@/lib/backend";
import type { FoodSearchHit } from "@/lib/backend/types";
import { useAsyncData } from "@/hooks/useData";
import { foodToLoggable, offToLoggable, type LoggableFood } from "./FoodLogProvider";
import { kcalOf } from "@/components/app/bits";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

function ResultRow({ food, onSelect }: { food: LoggableFood; onSelect: (f: LoggableFood) => void }) {
  return (
    <CommandItem value={`${food.name} ${food.brand ?? ""}`} onSelect={() => onSelect(food)} className="min-h-14 items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{food.name}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {food.brand && <span className="truncate">{food.brand}</span>}
          <span>{food.servingLabel}</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">{formatNumber(kcalOf(food.per100g), 0)} <span className="text-xs font-normal text-muted-foreground">kcal/100g</span></p>
        <p className={cn("text-[11px]", food.verified ? "text-primary" : "text-muted-foreground")}>{food.sourceLabel}</p>
      </div>
    </CommandItem>
  );
}

export function FoodSearchDialog({
  open,
  onClose,
  onPicked,
}: {
  open: boolean;
  onClose: () => void;
  target: { entryDate: string; mealType: MealType; editEntryId?: string } | null;
  onPicked: (food: LoggableFood) => void;
}) {
  const [q, setQ] = useState("");
  const [hit, setHit] = useState<FoodSearchHit | null>(null);
  const [searching, setSearching] = useState(false);
  const reqId = useRef(0);

  const recents = useAsyncData(() => backend.getRecentEntries(8), [], "recent:8");
  const favorites = useAsyncData(() => backend.getFavorites(), [], "favorites");

  useEffect(() => {
    if (!open) {
      setQ("");
      setHit(null);
    }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHit(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++reqId.current;
    const t = setTimeout(() => {
      backend
        .searchFoods(term)
        .then((res) => {
          if (id === reqId.current) setHit(res);
        })
        .catch(() => {
          if (id === reqId.current) setHit({ local: [], remote: [], attribution: null, warning: "Search failed. Try again." });
        })
        .finally(() => {
          if (id === reqId.current) setSearching(false);
        });
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const barcodeLookup = async () => {
    const code = q.trim();
    if (!/^\d{6,}$/.test(code)) {
      toast.error("Enter a numeric barcode (6 digits or more)");
      return;
    }
    setSearching(true);
    try {
      const res = await backend.lookupBarcode(code);
      setHit(res);
      if (!res.local.length && !res.remote.length) toast.info("No product found for that barcode");
    } catch {
      toast.error("Barcode lookup failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  const showRecents = q.trim().length < 2;

  return (
    <CommandDialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)} className="!top-auto !bottom-0 !translate-y-0 max-h-[88dvh] w-full !max-w-none rounded-t-xl rounded-b-none sm:!top-1/2 sm:!bottom-auto sm:!-translate-y-1/2 sm:!max-w-lg sm:rounded-lg">
      <CommandInput placeholder="Search foods, brands, or paste a barcode…" value={q} onValueChange={setQ} />
      <CommandList>
        {searching && <p className="px-4 py-3 text-sm text-muted-foreground">Searching…</p>}
        {!searching && showRecents && (
          <>
            {favorites.data && favorites.data.length > 0 && (
              <CommandGroup heading="Favourites">
                {favorites.data.map((fav) => (
                  <ResultRow key={fav.id} food={foodToLoggable(fav.food)} onSelect={onPicked} />
                ))}
              </CommandGroup>
            )}
            {recents.data && recents.data.length > 0 && (
              <CommandGroup heading="Recent">
                {recents.data.map((entry) => (
                  <CommandItem
                    key={entry.id}
                    value={`recent-${entry.id}-${entry.name}`}
                    onSelect={() =>
                      onPicked({
                        foodId: entry.foodId,
                        name: entry.name,
                        brand: entry.brand,
                        per100g: per100gFromBase(entry.baseNutrients, entry.grams),
                        servingLabel: `${formatNumber(entry.grams, 0)} g`,
                        servingGrams: entry.grams,
                        verified: false,
                        sourceLabel: "Previously logged",
                      })
                    }
                    className="min-h-14 items-center gap-3 py-3"
                  >
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(entry.grams, 0)} g, {entry.portionPercent}%</p>
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground">{formatNumber(kcalOf(entry.nutrients))} kcal</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!recents.loading && (recents.data?.length ?? 0) === 0 && (favorites.data?.length ?? 0) === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Search the food database to log your first item.
              </p>
            )}
          </>
        )}
        {!searching && !showRecents && hit && (
          <>
            {hit.local.length > 0 && (
              <CommandGroup heading="Food database">
                {hit.local.map((food) => (
                  <ResultRow key={food.id} food={foodToLoggable(food)} onSelect={onPicked} />
                ))}
              </CommandGroup>
            )}
            {hit.remote.length > 0 && (
              <CommandGroup heading="Open Food Facts">
                {hit.remote.map((product, i) => (
                  <ResultRow key={`${product.sourceId ?? i}`} food={offToLoggable(product)} onSelect={onPicked} />
                ))}
              </CommandGroup>
            )}
            {hit.local.length === 0 && hit.remote.length === 0 && (
              <CommandEmpty>No matches. Try a shorter term.</CommandEmpty>
            )}
            {hit.warning && <p className="px-4 py-2 text-xs text-warning">{hit.warning}</p>}
            {hit.attribution && <p className="px-4 pb-3 pt-1 text-[11px] text-muted-foreground/70">{hit.attribution}</p>}
          </>
        )}
        <CommandSeparator />
        <CommandGroup>
          <CommandItem onSelect={barcodeLookup} className="gap-2 text-muted-foreground">
            <Barcode className="h-4 w-4" /> Look up "{q.trim()}" as a barcode
          </CommandItem>
          <CommandItem
            onSelect={() => {
              const term = q.trim();
              if (!term) return;
              onClose();
              onPicked({
                foodId: null,
                name: term.charAt(0).toUpperCase() + term.slice(1),
                brand: null,
                per100g: { kcal: null, protein: null, carbs: null, fat: null },
                servingLabel: "100 g",
                servingGrams: 100,
                verified: false,
                sourceLabel: "Quick add",
              });
            }}
            className="gap-2 text-muted-foreground"
          >
            <Plus className="h-4 w-4" /> Quick add "{q.trim() || "custom item"}" (nutrition unknown until entered)
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function per100gFromBase(base: NutrientRecord, grams: number): NutrientRecord {
  const factor = Math.max(grams, 1) / 100;
  const out: NutrientRecord = {};
  for (const [k, v] of Object.entries(base) as [string, number | null][]) {
    out[k as keyof NutrientRecord] = v == null ? null : Math.round((v / factor) * 10) / 10;
  }
  return out;
}

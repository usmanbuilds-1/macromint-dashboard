import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Food, MealType, NutrientRecord } from "@/types";
import type { OffFoodHit } from "@/lib/backend/types";

/** A loggable item: a database food, an Open Food Facts product, or a
 *  custom food, normalised to one shape. */
export interface LoggableFood {
  foodId: string | null;
  name: string;
  brand: string | null;
  per100g: NutrientRecord;
  servingLabel: string;
  servingGrams: number;
  verified: boolean;
  sourceLabel: string;
}

export function foodToLoggable(food: Food): LoggableFood {
  return {
    foodId: food.id,
    name: food.name,
    brand: food.brand,
    per100g: food.per100g,
    servingLabel: food.servingLabel,
    servingGrams: food.servingGrams,
    verified: food.verified,
    sourceLabel: food.source === "custom" ? "Custom" : food.verified ? "Verified" : "Estimate",
  };
}

export function offToLoggable(hit: OffFoodHit): LoggableFood {
  return {
    foodId: null,
    name: hit.name,
    brand: hit.brand,
    per100g: hit.per100g,
    servingLabel: hit.servingLabel,
    servingGrams: hit.servingGrams,
    verified: false,
    sourceLabel: "Open Food Facts",
  };
}

export interface FoodLogTarget {
  entryDate: string;
  mealType: MealType;
  /** Existing diary entry → serving config opens in edit mode. */
  editEntryId?: string;
  initialFood?: LoggableFood;
}

interface FoodLogContextValue {
  open: (target: FoodLogTarget) => void;
  openSearch: (target: FoodLogTarget) => void;
  openScan: (target: { entryDate: string; mealType: MealType }) => void;
}

const FoodLogContext = createContext<FoodLogContextValue | null>(null);

export function useFoodLog(): FoodLogContextValue {
  const ctx = useContext(FoodLogContext);
  if (!ctx) throw new Error("useFoodLog must be used inside FoodLogProvider");
  return ctx;
}

interface ProviderProps {
  children: React.ReactNode;
  renderSearch: (props: { open: boolean; onClose: () => void; target: FoodLogTarget | null; onPicked: (food: LoggableFood) => void }) => React.ReactNode;
  renderServing: (props: { food: LoggableFood | null; target: FoodLogTarget | null; onClose: () => void }) => React.ReactNode;
  renderScan: (props: { open: boolean; target: { entryDate: string; mealType: MealType } | null; onClose: () => void }) => React.ReactNode;
}

export function FoodLogProvider({ children, renderSearch, renderServing, renderScan }: ProviderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [target, setTarget] = useState<FoodLogTarget | null>(null);
  const [picked, setPicked] = useState<LoggableFood | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<{ entryDate: string; mealType: MealType } | null>(null);

  const open = useCallback((t: FoodLogTarget) => {
    setTarget(t);
    setPicked(t.initialFood ?? null);
    // A separate Scan photo action exists; skip the redundant chooser.
    setSearchOpen(!t.initialFood && !t.editEntryId);
  }, []);

  const openSearch = useCallback((t: FoodLogTarget) => {
    setTarget(t);
    setPicked(null);
    setSearchOpen(true);
  }, []);

  const openScan = useCallback((t: { entryDate: string; mealType: MealType }) => {
    setScanTarget(t);
    setScanOpen(true);
  }, []);

  const value = useMemo(() => ({ open, openSearch, openScan }), [open, openSearch, openScan]);

  return (
    <FoodLogContext.Provider value={value}>
      {children}
      {renderSearch({
        open: searchOpen,
        onClose: () => setSearchOpen(false),
        target,
        onPicked: (food) => {
          setPicked(food);
          setSearchOpen(false);
        },
      })}
      {renderServing({
        food: picked,
        target,
        onClose: () => {
          setPicked(null);
          setTarget(null);
        },
      })}
      {renderScan({
        open: scanOpen,
        target: scanTarget,
        onClose: () => {
          setScanOpen(false);
          setScanTarget(null);
        },
      })}
    </FoodLogContext.Provider>
  );
}

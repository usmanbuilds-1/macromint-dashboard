import { useState } from "react";
import { suggestedMealNow } from "@/lib/nutrition/meal-slot";
import { toast } from "sonner";
import { Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JourneyIntro } from "@/components/app/JourneyIntro";
import { JourneyEmpty } from "@/components/app/JourneyEmpty";
import { CustomFoodDialog } from "./CustomFoodDialog";
import { SavedMealsTab } from "./SavedMealsTab";
import { matchingFavorite, toggleFavoriteCandidate } from "./favorite-actions";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { kcalOf } from "@/components/app/bits";
import { backend, bumpData } from "@/lib/backend";
import { useAsyncData } from "@/hooks/useData";
import { todayStr } from "@/lib/nutrition/datetime";
import { foodToLoggable, offToLoggable, useFoodLog, type LoggableFood } from "./FoodLogProvider";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
          <Button variant="ghost" size="icon" aria-label={favActive ? `Remove ${food.name} from favorites` : `Add ${food.name} to favorites`} aria-pressed={Boolean(favActive)} onClick={onFav}>
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
  const [q, setQ] = useState("");
  const [hit, setHit] = useState<Awaited<ReturnType<typeof backend.searchFoods>> | null>(null);
  const [searching, setSearching] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const today = todayStr();

  const favorites = useAsyncData(() => backend.getFavorites(), [], "favorites");
  const favoriteIds = new Set((favorites.data ?? []).map((favorite) => favorite.foodId));

  const toggleFavorite = async (foodId: string) => {
    try {
      const added = await backend.toggleFavorite(foodId);
      bumpData();
      toast.success(added ? "Added to favorites" : "Removed from favorites");
    } catch {
      toast.error("Couldn't change favorites. Try again.");
    }
  };

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
    foodLog.open({ entryDate: today, mealType: suggestedMealNow(), initialFood: food });
  };

  return (
    <div className="mm6-subpage mm6-page-foods mm-journey-foods flex flex-col gap-6">
      <JourneyIntro
        eyebrow="FOOD LIBRARY"
        title="Foods"
        description="Search or save foods you eat often. Tap Log to choose a portion for today."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="meals">Saved meals</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mm-journey-food-search mt-4 flex flex-col gap-4">
          <form
            className="mm-journey-search-form flex gap-2"
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
                placeholder="Search for a food or meal"
                className="pl-9"
                aria-label="Search foods"
              />
            </div>
            <Button type="submit" disabled={searching}>{searching ? "Searching…" : "Search"}</Button>
          </form>
          <div className="mm-journey-food-options" aria-label="Other ways to log food">
            <button type="button" onClick={() => foodLog.openScan({ entryDate: today, mealType: suggestedMealNow() })}>
              <span>Scan a photo</span><small>Camera or existing image</small>
            </button>
            <button type="button" onClick={() => setCustomOpen(true)}>
              <span>Create a food</span><small>Enter nutrition from a label</small>
            </button>
          </div>

          {hit && (
            <div className="mm-journey-food-results overflow-hidden border-y">
              {hit.local.length === 0 && hit.remote.length === 0 ? (
                <JourneyEmpty
                  title={`No matches for “${q}”`}
                  description="Try a different name or brand, or add the nutrition values yourself."
                  actionLabel="Create custom food"
                  onAction={() => setCustomOpen(true)}
                />
              ) : (
                <>
                  {hit.local.map((food) => (
                    <FoodRow key={food.id} food={foodToLoggable(food)} onLog={log}
                      favActive={favoriteIds.has(food.id)} onFav={() => { void toggleFavorite(food.id); }} />
                  ))}
                  {hit.remote.map((product, i) => (
                    <FoodRow key={`off-${i}`} food={offToLoggable(product)} onLog={log}
                      favActive={Boolean(matchingFavorite(favorites.data ?? [], offToLoggable(product)))}
                      onFav={() => { void toggleFavoriteCandidate(offToLoggable(product), favorites.data ?? undefined)
                        .then((added) => { bumpData(); toast.success(added ? "Added to favorites" : "Removed from favorites"); })
                        .catch(() => toast.error("Could not update favorites")); }} />
                  ))}
                </>
              )}
              {hit.warning && <p className="border-t px-4 py-2 text-xs text-warning">{hit.warning}</p>}
              {hit.attribution && <p className="border-t px-4 py-2 text-[11px] text-muted-foreground/70">{hit.attribution}</p>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-4">
          <div className="mm-journey-food-results overflow-hidden border-y">
            {favorites.data && favorites.data.length > 0 ? (
              favorites.data.map((fav) => (
                <FoodRow
                  key={fav.id}
                  food={foodToLoggable(fav.food)}
                  onLog={log}
                  favActive
                  onFav={() => { void toggleFavorite(fav.foodId); }}
                />
              ))
            ) : (
              <JourneyEmpty
                title="No favorites yet"
                description="Star a food while searching. It will appear here for faster logging next time."
                actionLabel="Find a food"
                onAction={() => setActiveTab("search")}
              />
            )}
          </div>
        </TabsContent>
        <TabsContent value="meals" className="mt-4">
          <SavedMealsTab active={activeTab === "meals"} />
        </TabsContent>
      </Tabs>

      <CustomFoodDialog open={customOpen} onClose={() => setCustomOpen(false)} onCreated={(food) => log(foodToLoggable(food))} />
    </div>
  );
}


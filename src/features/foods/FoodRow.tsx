import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber, cn } from "@/lib/utils";
import type { LoggableFood } from "./FoodLogProvider";

export function FoodRow({ food, onLog, favActive, onFav }: { food: LoggableFood; onLog: (f: LoggableFood) => void; favActive?: boolean; onFav?: () => void }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-4 py-3", "border-t first:border-t-0")}>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onLog(food)}>
        <p className="truncate text-sm font-medium">
          {food.name}
          {food.brand && <span className="font-normal text-muted-foreground"> · {food.brand}</span>}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{food.servingLabel}</span>
          <span className="tabular-nums">{food.per100g.kcal == null ? "Calories unknown" : `${formatNumber(food.per100g.kcal)} kcal per 100 g`}</span>
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

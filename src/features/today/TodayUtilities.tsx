import { useState } from "react";
import { Droplets, Plus } from "lucide-react";
import { backend } from "@/lib/backend";
import { useAsyncData } from "@/hooks/useData";

/** Secondary utility: water isn't fetched on the critical Today path.
 * Opening the disclosure loads the existing, account-scoped water log. */
export function TodayUtilities({
  date, waterTarget, onAddWater,
}: {
  date: string;
  waterTarget: number | null;
  onAddWater: () => void;
}) {
  const [open, setOpen] = useState(false);
  const water = useAsyncData(() => backend.getWater(date), [date], "water:day", open);
  const amount = (water.data ?? []).reduce((sum, item) => sum + item.amountMl, 0);
  return (
    <details className="mm-home-utilities" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="mm-home-water-summary">
        <Droplets className="h-4 w-4" aria-hidden="true" />
        <span>Water</span>
        <span className="mm-home-water-amount tabular-nums">
          {open && water.loading ? "Loading…" : !open && !water.data ? "Optional" : `${(amount / 1000).toFixed(1)} L`}
          {waterTarget !== null && open && !water.loading && ` / ${(waterTarget / 1000).toFixed(1)} L`}
        </span>
      </summary>
      <div className="mm-home-water-controls">
        {water.error && (
          <p role="alert" className="mm-home-water-error">
            Water log unavailable. <button type="button" onClick={water.reload}>Retry</button>
          </p>
        )}
        <button type="button" className="mm-home-water-action" onClick={onAddWater}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add 250 ml
        </button>
      </div>
    </details>
  );
}

import { Droplets, Plus } from "lucide-react";

/** Water tracking remains available without taking priority over food. */
export function TodayUtilities({
  waterMl, waterTarget, loading, onAddWater,
}: {
  waterMl: number;
  waterTarget: number | null;
  loading: boolean;
  onAddWater: () => void;
}) {
  return (
    <details className="mm-home-utilities">
      <summary className="mm-home-water-summary">
        <Droplets className="h-4 w-4" aria-hidden="true" />
        <span>Water</span>
        <span className="mm-home-water-amount tabular-nums">
          {loading ? "—" : `${(waterMl / 1000).toFixed(1)} L`}
          {waterTarget !== null && ` / ${(waterTarget / 1000).toFixed(1)} L`}
        </span>
      </summary>
      <div className="mm-home-water-controls">
        <button type="button" className="mm-home-water-action" onClick={onAddWater}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add 250 ml
        </button>
      </div>
    </details>
  );
}

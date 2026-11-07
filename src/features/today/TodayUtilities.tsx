import { Droplets, Plus } from "lucide-react";

export function TodayUtilities({
  waterMl, waterTarget, loading, onAddWater,
}: {
  waterMl: number;
  waterTarget: number | null;
  loading: boolean;
  onAddWater: () => void;
}) {
  return (
    <section className="mm-home-utilities" aria-label="Water and everyday actions">
      <div className="mm-home-water">
        <Droplets className="h-5 w-5" aria-hidden="true" />
        <div className="mm-home-water-copy">
          <strong>Water</strong>
          <span className="tabular-nums">
            {loading ? "—" : `${(waterMl / 1000).toFixed(1)} L`}
            {waterTarget !== null && ` / ${(waterTarget / 1000).toFixed(1)} L`}
          </span>
        </div>
        <button type="button" className="mm-home-water-action" onClick={onAddWater}>
          <Plus className="h-4 w-4" aria-hidden="true" /> 250 ml
        </button>
      </div>
    </section>
  );
}

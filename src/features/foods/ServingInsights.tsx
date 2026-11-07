import { regionalPortions } from "@/lib/nutrition/regional-portions";
import { loggableFoodQuality } from "@/lib/nutrition/food-quality";
import type { LoggableFood } from "./FoodLogProvider";

/** Honest source and quantity guidance, always subordinate to editable grams. */
export function ServingInsights({ food, onApplyEstimate }: {
  food: LoggableFood;
  onApplyEstimate: (grams: number) => void;
}) {
  const quality = loggableFoodQuality(food);
  const measures = regionalPortions(food.name);
  return (
    <section className="mm-serving-insights" aria-label="Nutrition and portion reliability">
      <div className="mm-quality-header">
        <span>{food.verified ? "Source verified" : "Not independently verified"}</span>
        <span>{quality.macrosKnown} of {quality.macrosTotal} key nutrients listed</span>
      </div>
      {quality.warning && <p className="mm-quality-note">{quality.warning}. A blank nutrient is unknown, not zero.</p>}
      {measures.length > 0 && (
        <div className="mm-regional-portion">
          <p>Kitchen measures <span className="mm-quality-note">· estimates only</span></p>
          <div className="mm-regional-choices">
            {measures.map((item) => (
              <button type="button" key={item.id} onClick={() => onApplyEstimate(item.grams)}
                aria-label={`Use approximate ${item.label}, ${item.grams} grams`}>
                {item.label} <small>≈{item.grams} g</small>
              </button>
            ))}
          </div>
          <p className="mm-food-portion-note">Weights depend on your ingredients, bowl and cooking. Check and edit grams before saving.</p>
        </div>
      )}
    </section>
  );
}

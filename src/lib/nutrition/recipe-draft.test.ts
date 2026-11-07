import { describe, expect, it } from "vitest";
import { recipeDraftNutrition, validateRecipeDraft, type RecipeDraft } from "./recipe-draft";
const base: RecipeDraft = { name: "Daal", servings: 4, notes: "", ingredients: [
  { key:"1", name:"Lentils", grams: 200, per100g:{ kcal:300, protein:20 } },
  { key:"2", name:"Oil", grams: 10, per100g:{ kcal:null, fat:100 } },
]};
describe("recipe draft validation and reliability", () => {
  it("rejects unbounded food quantities and nonfinite values", () => {
    expect(validateRecipeDraft({ ...base, ingredients:[{...base.ingredients[0]!, grams:Infinity}] })).toMatch(/amounts/);
    expect(validateRecipeDraft({ ...base, servings:0 })).toMatch(/Servings/);
    expect(validateRecipeDraft({ ...base, ingredients:[] })).toMatch(/ingredients/);
  });
  it("does not silently count an unknown oil calorie as zero", () => {
    expect(recipeDraftNutrition(base)).toMatchObject({ knownEnergy:600, completeEnergy:false, kcalKnownIngredients:1, perServingKnownEnergy:150 });
  });
});

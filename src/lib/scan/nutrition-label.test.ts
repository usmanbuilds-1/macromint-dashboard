import { describe,expect,it } from "vitest";
import { parseNutritionLabel } from "../../../supabase/functions/ai-scan/nutrition-label";
describe("label extraction is never a guessed meal estimate",()=>{
  it("converts a disclosed gram serving and preserves nulls",()=>{
    const item=parseNutritionLabel({productName:"Biscuits",basis:"perServing",servingGrams:25,
      nutrients:{kcal:120,protein:2,carbs:18,fat:5,fiber:null,sodiumMg:45}});
    expect(item?.per100g).toMatchObject({kcal:480,protein:8,carbs:72,fat:20,sodium:180,fiber:null});
  });
  it("will not assume volume is mass or salt is sodium",()=>{
    const item=parseNutritionLabel({basis:"per100ml",servingGrams:null,
      nutrients:{kcal:40,protein:2,carbs:5,fat:0,sodiumMg:null}});
    expect(item?.per100g).toBeNull();
    expect(item?.warnings.join(" ")).toMatch(/not converted/);
  });
  it("rejects missing and out-of-range model output",()=>{
    expect(parseNutritionLabel({basis:"per100g",nutrients:{kcal:"450"}})).toBeNull();
    expect(parseNutritionLabel({basis:"per100g",nutrients:{kcal:-50,protein:Infinity}})).toBeNull();
  });
});

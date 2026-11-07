import { describe, expect, it } from "vitest";
import type { SavedMeal } from "@/types";
import { groceryFromSavedMeals } from "./grocery";
const meal = (id:string, name:string,grams:number)=>({id,items:[{name,grams,per100g:{}}]} as SavedMeal);
describe("private grocery list derived from selected saved meals",()=>{
  it("groups identical food ingredients without making up quantities",()=>{
    expect(groceryFromSavedMeals([meal("1","Rice",80),meal("2","rice",120)],{"1":2,"2":1}))
      .toEqual([{name:"Rice",grams:280,sources:2}]);
  });
  it("refuses unreasonable multiplication",()=>{
    expect(()=>groceryFromSavedMeals([meal("a","rice",100)],{"a":1000})).toThrow(RangeError);
  });
});

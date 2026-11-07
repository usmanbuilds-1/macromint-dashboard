import { describe, expect, it } from "vitest";
import type { DiaryEntry, MealType } from "@/types";
import { rankRecentForMeal } from "./rank-recent";
const make=(name:string,mealType:MealType,day:string,time:string)=>({name,mealType,entryDate:day,loggedAt:time,brand:null} as DiaryEntry);
describe("reusing real habits",()=>{
  it("prefers a repeatedly logged meal over a one-off recent item",()=>{
    const entries=[
      make("Pizza","dinner","2026-11-07","2026-11-07T22:00:00Z"),
      make("Eggs","breakfast","2026-11-06","2026-11-06T08:00:00Z"),
      make("Eggs","breakfast","2026-11-05","2026-11-05T09:00:00Z"),
    ];
    expect(rankRecentForMeal(entries,"2026-11-08","breakfast")?.name).toBe("Eggs");
  });
  it("never treats today's already logged foods as past history",()=>{
    expect(rankRecentForMeal([make("Rice","lunch","2026-11-08","2026-11-08T09:00:00Z")],"2026-11-08","lunch")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { describeMeal } from "./describe-meal";
describe("assisted food description without invented nutrition", () => {
  it("keeps unconfirmed quantity separate from food search", () => {
    expect(describeMeal("2 eggs, 1 cup chai and 1 roti")).toEqual([
      { original:"2 eggs", amountText:"2", searchTerm:"eggs" },
      { original:"1 cup chai", amountText:"1 cup", searchTerm:"tea" },
      { original:"1 roti", amountText:"1", searchTerm:"roti" },
    ]);
  });
  it("limits unbounded and hostile input", () => {
    expect(()=>describeMeal("a".repeat(401))).toThrow(RangeError);
    expect(()=>describeMeal("a,b,c,d,e,f,g,h,i")).toThrow(RangeError);
    expect(describeMeal("")).toEqual([]);
  });
});

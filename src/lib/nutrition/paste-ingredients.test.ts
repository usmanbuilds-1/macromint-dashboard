import { describe, expect, it } from "vitest";
import { parsePastedIngredients } from "./paste-ingredients";

describe("safe, local ingredient text import", () => {
  it("accepts real ingredient lines, including bullet and numbered formats", () => {
    expect(parsePastedIngredients("- 200 g lentils\r\n2. 1 tbsp oil\n• 2 onions")).toEqual([
      { label:"200 g lentils", searchTerm:"lentils", gramsHint:200 },
      { label:"1 tbsp oil", searchTerm:"oil", gramsHint:null },
      { label:"2 onions", searchTerm:"onions", gramsHint:null },
    ]);
  });
  it("converts only explicit gram-based weights, not kitchen-volume measures", () => {
    expect(parsePastedIngredients("1.5 kg flour\n1 cup milk")).toEqual([
      { label:"1.5 kg flour", searchTerm:"flour", gramsHint:1500 },
      { label:"1 cup milk", searchTerm:"milk", gramsHint:null },
    ]);
  });
  it("supports labels with no quantities without making up serving sizes", () => {
    expect(parsePastedIngredients("Ingredients:\nBasmati rice\nTomatoes"))
      .toEqual([
        { label:"Basmati rice", searchTerm:"Basmati rice", gramsHint:null },
        { label:"Tomatoes", searchTerm:"Tomatoes", gramsHint:null },
      ]);
  });
  it("rejects URL, HTML, control codes, too many lines and extreme quantities", () => {
    for (const unsafe of [
      "https://example.com/recipe",
      '<script>alert("hi")</script>',
      "3 g rice\u0000",
      "10001 g flour",
      Array.from({length:31},(_,i)=>"food "+i).join("\n"),
      " "
    ]) expect(() => parsePastedIngredients(unsafe)).toThrow();
  });
});

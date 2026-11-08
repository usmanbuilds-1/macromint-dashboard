import { describe,expect,it } from "vitest";
import { allowedRecipeUrl,extractRecipeFromHtml } from "../../../supabase/functions/recipe-import/schema-recipe";
describe("bounded recipe import",()=>{
  it("only permits canonical public recipe hosts and strips tracking queries",()=>{
    expect(allowedRecipeUrl("https://www.bbcgoodfood.com/recipes/lentils?utm_source=test")).toBe("https://www.bbcgoodfood.com/recipes/lentils");
    expect(allowedRecipeUrl("https://127.0.0.1/private")).toBeNull();
    expect(allowedRecipeUrl("http://www.allrecipes.com/recipes/123")).toBeNull();
    expect(allowedRecipeUrl("https://www.allrecipes.com.evil.test/recipe")).toBeNull();
    expect(allowedRecipeUrl("https://user:password@www.allrecipes.com/recipe")).toBeNull();
  });
  it("imports only structured ingredient strings without guessing nutrition",()=>{
    const html=`<script type="application/ld+json">{"@context":"https://schema.org","@type":"Recipe","name":"Home daal","recipeYield":"4 servings","recipeIngredient":["200 g lentils","1 tbsp oil"]}</script>`;
    expect(extractRecipeFromHtml(html)).toEqual({name:"Home daal",servings:4,ingredients:["200 g lentils","1 tbsp oil"]});
  });
  it("rejects unstructured html and oversized responses",()=>{
    expect(extractRecipeFromHtml("<h1>Don't run scripts</h1>")).toBeNull();
    expect(extractRecipeFromHtml("x".repeat(600_001))).toBeNull();
  });
});

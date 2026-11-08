import { useState } from "react";
import { toast } from "sonner";
import { parsePastedIngredients, type PastedIngredient } from "@/lib/nutrition/paste-ingredients";

/** No network call, file upload, AI request, or URL fetching. */
export function RecipeTextImport({ onImported }: {
  onImported: (ingredients: PastedIngredient[]) => void;
}) {
  const [text, setText] = useState("");
  const preview = () => {
    try {
      onImported(parsePastedIngredients(text));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check the ingredient list.");
    }
  };
  return (
    <details className="mm-feature-disclosure mm-recipe-import">
      <summary className="mm-feature-disclosure-trigger">Paste ingredients</summary>
      <div className="mm-feature-body">
        <p className="mm-feature-muted">
          Copy the ingredient list from a recipe, with one food per line.
          Nothing is uploaded or analyzed by AI. You'll confirm every match and quantity.
        </p>
        <label className="mm-feature-field">Ingredient list
          <textarea
            rows={5}
            maxLength={10_000}
            autoComplete="off"
            spellCheck={false}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={"200 g lentils\n1 tbsp oil\n2 onions"}
            className="min-h-28 w-full rounded border bg-transparent p-3 text-sm leading-6"
          />
        </label>
        <button type="button" disabled={!text.trim()} className="mm-recipe-save"
          onClick={preview}>Review ingredients</button>
        <p className="mm-feature-muted">
          Gram weights in your text are suggestions; cups, spoons and pieces are not
          automatically converted to grams. Up to 30 ingredients.
        </p>
      </div>
    </details>
  );
}

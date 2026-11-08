/** Local-only recipe ingredient paste. No URL fetch, HTML parsing, or nutrition inference.
 * Explicit gram/kilogram amounts may be suggested but must be confirmed. */
export interface PastedIngredient {
  label: string;
  searchTerm: string;
  gramsHint: number | null;
}

const GRAM_PREFIX = /^(\d+(?:[.,]\d+)?)\s*(kg|grams?|g)\b[\s,:-]*(.*)$/i;
const PORTION_PREFIX = /^(?:\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|[½¼¾])\s*(?:(?:cups?|tablespoons?|tbsp|teaspoons?|tsp|pieces?|pcs|slices?|whole|small|medium|large|ml|litres?|liters?)\b\s*)?(?:of\s+)?(.+)$/i;
const URL = /(?:https?:\/\/|www\.)/i;

export function parsePastedIngredients(text: string): PastedIngredient[] {
  if (text.length > 10_000) throw new RangeError("Paste up to 10,000 characters.");
  const cleaned = text.replace(/\r\n?/g, "\n").split("\n")
    .map((line) => line.trim().replace(/^(?:[-*•–]\s*|\d{1,2}[.)]\s+)/, "").trim())
    .filter((line) => line && !/^ingredients\s*:?\s*$/i.test(line));
  if (!cleaned.length) throw new RangeError("Paste at least one ingredient.");
  if (cleaned.length > 30) throw new RangeError("A recipe can have at most 30 ingredients.");

  return cleaned.map((line) => {
    if (line.length > 180 || URL.test(line) ||
      [...line].some((ch) => ch.charCodeAt(0) < 32 || ch === "<" || ch === ">")) {
      throw new RangeError("Use plain ingredient lines under 180 characters, without links or HTML.");
    }
    let searchTerm = line;
    let gramsHint: number | null = null;
    const gram = GRAM_PREFIX.exec(line);
    if (gram) {
      const numeric = Number((gram[1] ?? "").replace(",", "."));
      const factor = gram[2]?.toLowerCase() === "kg" ? 1_000 : 1;
      gramsHint = numeric * factor;
      if (!Number.isFinite(gramsHint) || gramsHint < 0.1 || gramsHint > 10_000)
        throw new RangeError("Ingredient gram amounts must be between 0.1 g and 10 kg.");
      searchTerm = gram[3]?.trim() || "";
    } else {
      searchTerm = PORTION_PREFIX.exec(line)?.[1]?.trim() || line;
    }
    if (searchTerm.length < 2 || searchTerm.length > 160)
      throw new RangeError("Every ingredient needs a recognizable food name.");
    return { label: line, searchTerm, gramsHint };
  });
}

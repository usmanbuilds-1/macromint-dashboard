/**
 * Human-readable CSV exports, based solely on the user's authenticated export.
 * Values absent from a logged food stay BLANK (not false zeroes).
 * Text fields defend against spreadsheet formula injection.
 */
type Row = Record<string, unknown>;

function asRow(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function first(row: Row, ...keys: string[]): unknown {
  for (const key of keys) if (row[key] !== undefined && row[key] !== null) return row[key];
  return null;
}

function safeNutrients(raw: unknown): Row {
  if (typeof raw === "string") {
    try { return asRow(JSON.parse(raw)); }
    catch { return {}; }
  }
  return asRow(raw);
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "number"
    ? (Number.isFinite(value) ? String(value) : "")
    : typeof value === "boolean" ? String(value) : String(value);
  // Spreadsheet software can execute formulas embedded in imported CSV text.
  // Prepend an apostrophe, even when hostile text starts with whitespace.
  const safe = typeof value === "string" && /^[\s\uFEFF]*[=+@\-]/u.test(text)
    ? "'" + text
    : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

function csv(headers: readonly string[], rows: readonly unknown[][]): string {
  return [headers.map(escapeCsvCell).join(","),
    ...rows.map(row => row.map(escapeCsvCell).join(",")),
  ].join("\r\n") + "\r\n";
}

function rowsOf(exportData: Record<string, unknown>, key: string): Row[] {
  const value = exportData[key];
  if (!Array.isArray(value)) {
    throw new Error(`Export is missing a valid ${key} collection`);
  }
  return value.map(asRow);
}

export function diaryExportCsv(exportData: Record<string, unknown>): string {
  const rows = rowsOf(exportData, "diary").map(row => {
    const nutrients = safeNutrients(row["nutrients"]);
    return [
      first(row, "entry_date", "entryDate"),
      first(row, "meal_type", "mealType"),
      row["name"], row["brand"],
      row["grams"], first(row, "portion_percent", "portionPercent"),
      row["source"],
      nutrients["kcal"], nutrients["protein"], nutrients["carbs"],
      nutrients["fat"], nutrients["fiber"],
      first(row, "logged_at", "loggedAt", "created_at", "createdAt"),
    ];
  });
  return csv([
    "Date", "Meal", "Food", "Brand", "Logged grams", "Portion %",
    "Source", "Calories (kcal)", "Protein (g)", "Carbs (g)",
    "Fat (g)", "Fiber (g)", "Logged at",
  ], rows);
}

export function weightExportCsv(exportData: Record<string, unknown>): string {
  const rows = rowsOf(exportData, "weightEntries").map(row => [
    first(row, "entry_date", "entryDate"),
    first(row, "weight_kg", "weightKg"),
    row["note"],
    first(row, "created_at", "createdAt"),
  ]);
  return csv(["Date", "Weight (kg)", "Note", "Recorded at"], rows);
}

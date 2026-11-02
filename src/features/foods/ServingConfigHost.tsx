import { useEffect, useState } from "react";
import { backend } from "@/lib/backend";
import type { DiaryEntry } from "@/types";
import { ServingConfigDialog } from "./ServingConfig";
import type { FoodLogTarget, LoggableFood } from "./FoodLogProvider";

/** Bridge between the FoodLogProvider and the serving dialog: resolves an
 *  existing diary entry when the target is in edit mode. */
export function ServingConfigHost({
  food,
  target,
  onClose,
}: {
  food: LoggableFood | null;
  target: FoodLogTarget | null;
  onClose: () => void;
}) {
  const [entry, setEntry] = useState<DiaryEntry | null>(null);

  useEffect(() => {
    setEntry(null);
    if (!target?.editEntryId) return;
    let cancelled = false;
    // Fetch the day and pick the entry (cheap; the day is usually cached by
    // the screen underneath).
    backend
      .getDiary(target.entryDate)
      .then((entries) => {
        if (!cancelled) setEntry(entries.find((e) => e.id === target.editEntryId) ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!target) return null;
  if (target.editEntryId && !entry) return null;
  return <ServingConfigDialog food={food} target={target} entry={entry} onClose={onClose} />;
}

import type { DiaryEntry } from "@/types";
import { formatNumber } from "@/lib/utils";
import { uniqueRecentFoods } from "./recent-food";

export function FoodsRecent({ entries, onLog }: {
  entries: DiaryEntry[];
  onLog: (entry: DiaryEntry) => void;
}) {
  const recent = uniqueRecentFoods(entries, 4);
  return (
    <section className="mm-foods-recent" aria-labelledby="foods-recent-heading">
      <h2 id="foods-recent-heading">Recently logged</h2>
      {recent.length ? (
        <ul>
          {recent.map((entry) => (
            <li key={entry.id}>
              <button type="button" className="mm-foods-recent-row"
                onClick={() => onLog(entry)}
                aria-label={`Log ${entry.name} again`}>
                <span className="mm-foods-recent-name">
                  <strong>{entry.name}</strong>
                  <small className="tabular-nums">{formatNumber(entry.grams * entry.portionPercent / 100, 0)} g last eaten</small>
                </span>
                <span className="mm-foods-recent-action">Log again</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Foods you log will appear here, ready to use again.</p>
      )}
    </section>
  );
}

import type { DiaryEntry } from "@/types";
import { ArrowUpRight } from "lucide-react";

/** No dummy recommendations: repeat is shown only for a real prior diary entry. */
export function TodayNextStep({ previous, onRepeat }: {
  previous: DiaryEntry | null;
  onRepeat: (entry: DiaryEntry) => void;
}) {
  return (
    <section className="mm-home-next" aria-label="Next step">
      {previous ? (
        <>
          <div>
            <p className="mm-home-next-label">Logged before</p>
            <p className="mm-home-next-name">{previous.name}</p>
            <p className="mm-home-next-description">Review the portion and add it again.</p>
          </div>
          <button type="button" className="mm-home-next-action" onClick={() => onRepeat(previous)}>
            Log again <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </>
      ) : (
        <div>
          <p className="mm-home-next-name">Start with one food.</p>
          <p className="mm-home-next-description">Your first entry will show how your day adds up.</p>
        </div>
      )}
    </section>
  );
}

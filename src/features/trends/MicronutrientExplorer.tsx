import { useMemo, useState } from "react";
import type { DiaryEntry, MicronutrientKey } from "@/types";
import { MICRONUTRIENT_KEYS, NUTRIENT_META } from "@/types";
import { microReport } from "@/lib/nutrition/micro-report";
import { formatNumber } from "@/lib/utils";

/** Entirely derived from the parent's ONE bounded diary-range read. */
export function MicronutrientExplorer({ entries, loading }: { entries: DiaryEntry[]; loading: boolean }) {
  const [key, setKey] = useState<MicronutrientKey>("fiber");
  const item = NUTRIENT_META.find((meta) => meta.key === key)!;
  const report = useMemo(() => microReport(entries, key), [entries, key]);
  return (
    <details className="mm-feature-disclosure" aria-label="Micronutrient explorer">
      <summary className="mm-feature-disclosure-trigger">
        <span>Vitamins, minerals and fibre</span><span className="mm-feature-disclosure-hint">Explore nutrients</span>
      </summary>
      <div className="mm-feature-body">
        <p className="mm-feature-muted">Values come only from foods you've logged. A missing nutrient value is not zero.</p>
        <label className="mm-feature-field">
          Nutrient
          <select aria-label="Choose nutrient" value={key} onChange={(event) => setKey(event.target.value as MicronutrientKey)}>
            {MICRONUTRIENT_KEYS.map((id) => {
              const meta = NUTRIENT_META.find((nutrient) => nutrient.key === id)!;
              return <option key={id} value={id}>{meta.label}</option>;
            })}
          </select>
        </label>
        {loading ? <p role="status" className="mm-feature-muted">Loading food history…</p> : (
          <>
            <div className="mm-feature-measure">
              <strong className="tabular-nums">{report.knownTotal === null ? "—" : formatNumber(report.knownTotal, 1)}</strong>
              <span>{item.unit} known in this period</span>
            </div>
            {entries.length === 0 ? <p className="mm-feature-muted">Log food to see your nutrient sources.</p> : (
              <p className="mm-feature-muted" role="status">
                Data present for {report.knownEntries} of {entries.length} entries.
                {report.missingEntries > 0 ? " This total is incomplete." : " All entries contain a value for this nutrient."}
              </p>
            )}
            {report.contributors.length > 0 && (
              <div className="mm-feature-food-sources">
                <h3>Known contributors</h3>
                <ul>{report.contributors.map((source) => (
                  <li key={source.entryId}><span>{source.food}</span><span className="tabular-nums">{formatNumber(source.value, 1)} {item.unit}</span></li>
                ))}</ul>
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}

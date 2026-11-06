import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

/** One actionable explanation instead of repeated dashed empty-state cards.
 * Do not imply the application has learned anything it has not measured. */
export function JourneyEmpty({
  title, description, actionLabel, onAction, supporting,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  supporting?: ReactNode;
}) {
  return (
    <div className="mm-journey-empty">
      <p className="mm-journey-eyebrow">A PLACE TO BEGIN</p>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button type="button" className="mm-journey-empty-action" onClick={onAction}>
          {actionLabel}<ArrowUpRight className="h-4 w-4" aria-hidden="true"/>
        </button>
      )}
      {supporting}
    </div>
  );
}

import type { ReactNode } from "react";

/** Shared hierarchy, never a decorative hero card. Keeps each page's title
 * and its one practical action easy to locate at every screen size. */
export function JourneyIntro({
  eyebrow, title, description, action, supporting,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  supporting?: ReactNode;
}) {
  return (
    <header className="mm-journey-intro">
      <div className="mm-journey-intro-copy">
        <p className="mm-journey-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="mm-journey-description">{description}</p>
        {supporting}
      </div>
      {action && <div className="mm-journey-intro-action">{action}</div>}
    </header>
  );
}

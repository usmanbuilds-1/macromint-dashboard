import { Link } from "@tanstack/react-router";

/** Honest first-run progress: no sample series, pretend streak or ghost chart. */
export function ProgressStart({ foodDays = 0, weighIns = 0 }: { foodDays?: number; weighIns?: number }) {
  return (
    <section className="mm-progress-first" aria-labelledby="progress-first-title">
      <h2 id="progress-first-title">{foodDays || weighIns ? "Your record is taking shape." : "Your trends start with real entries."}</h2>
      <p>{foodDays || weighIns ? "Keep recording what matters to you. We’ll only chart a trend when there is enough real data." : "Compare what you eat across days, and how your weight changes over time."}</p>
      <div className="mm-progress-first-steps" aria-label="How to get started">
        <div>
          <strong>Food trends</strong>
          <span className="tabular-nums">{Math.min(foodDays, 2)} of 2 days logged</span>
        </div>
        <div>
          <strong>Weight trends</strong>
          <span className="tabular-nums">{Math.min(weighIns, 2)} of 2 weigh-ins recorded</span>
        </div>
      </div>
      <div className="mm-progress-first-actions">
        <Link to="/diary" className="mm-progress-log-action">Log food</Link>
        <Link to="/weight" className="mm-progress-weight-action">Record weight</Link>
      </div>
    </section>
  );
}

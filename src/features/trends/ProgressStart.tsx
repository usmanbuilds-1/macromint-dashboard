import { Link } from "@tanstack/react-router";

/** Honest first-run progress: no sample series, pretend streak or ghost chart. */
export function ProgressStart() {
  return (
    <section className="mm-progress-first" aria-labelledby="progress-first-title">
      <h2 id="progress-first-title">Your trends start with real entries.</h2>
      <p>Compare what you eat across days, and how your weight changes over time.</p>
      <div className="mm-progress-first-steps" aria-label="How to get started">
        <div>
          <strong>Food trends</strong>
          <span>Log on two different days to compare your intake.</span>
        </div>
        <div>
          <strong>Weight trends</strong>
          <span>Record two weigh-ins to see a change.</span>
        </div>
      </div>
      <div className="mm-progress-first-actions">
        <Link to="/diary" className="mm-progress-log-action">Log food</Link>
        <Link to="/weight" className="mm-progress-weight-action">Record weight</Link>
      </div>
    </section>
  );
}

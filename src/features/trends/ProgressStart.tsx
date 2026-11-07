import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { addDaysStr } from "@/lib/nutrition/datetime";

/** Activity, not a streak: shows real diary dates and never penalizes a gap. */
export function ProgressStart({
  foodDays = 0, weighIns = 0, today = "",
  loggedDates = [],
}: {
  foodDays?: number;
  weighIns?: number;
  today?: string;
  loggedDates?: readonly string[];
}) {
  const lastSevenDays = today
    ? Array.from({ length: 7 }, (_, index) => addDaysStr(today, index - 6))
    : [];
  const logged = new Set(loggedDates);
  const activeDays = lastSevenDays.filter((date) => logged.has(date)).length;

  return (
    <section className="mm-progress-first" aria-labelledby="progress-first-title">
      <div className="mm-progress-first-heading">
        <h2 id="progress-first-title">{foodDays || weighIns ? "Your record is taking shape." : "Small entries. Clearer patterns."}</h2>
        <p>Food patterns need at least two recorded days. Weight changes need at least two weigh-ins. Missing days stay blank, not zero.</p>
      </div>

      {lastSevenDays.length > 0 && (
        <div className="mm-progress-week" aria-label="Food logging over the last seven days">
          <div className="mm-progress-week-heading">
            <h3>Last seven days</h3>
            <span className="tabular-nums">{activeDays} of 7 logged</span>
          </div>
          <ol className="mm-progress-week-days">
            {lastSevenDays.map((date) => {
              const active = logged.has(date);
              const day = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
              return (
                <li key={date} className={active ? "is-logged" : ""}>
                  <span className="mm-progress-week-name">{day.slice(0, 1)}</span>
                  <span className="mm-progress-week-indicator" role="img" aria-label={`${date}: ${active ? "food logged" : "no food recorded"}`}>
                    {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  </span>
                  <span className="mm-progress-week-day tabular-nums">{Number(date.slice(-2))}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="mm-progress-first-steps" aria-label="When insights become available">
        <div>
          <strong>Calorie patterns</strong>
          <span className="tabular-nums">{Math.min(foodDays, 2)} of 2 days logged</span>
        </div>
        <div>
          <strong>Weight changes</strong>
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

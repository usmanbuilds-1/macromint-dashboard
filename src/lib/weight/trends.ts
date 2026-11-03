import type { Objective, WeightEntry } from "@/types";

export type WeightObservation = Pick<WeightEntry, "entryDate" | "weightKg">;
export type WeightTrendStatus =
  | "insufficient_data"
  | "inconclusive"
  | "possible_plateau"
  | "on_track"
  | "opposite_direction"
  | "maintenance_stable"
  | "maintenance_drifting";

export interface WeightTrendAnalysis {
  status: WeightTrendStatus;
  objective: Objective;
  /** The default observation window is 28 full calendar days. */
  windowDays: number;
  loggedDays: number;
  /** A 7-day median resists noisy daily water fluctuations. */
  firstWeekMedianKg: number | null;
  lastWeekMedianKg: number | null;
  /** Robust Theil–Sen median pairwise slope, kg per 7 days. */
  weeklyTrendKg: number | null;
  weeklyTrendPct: number | null;
  /** Dispersion of pairwise slopes, not a 95% CI or p-value. */
  slopeIqrKgPerWeek: number | null;
  likelyNoise: boolean;
  thresholdPctPerWeek: number;
  daysSinceLastEntry: number | null;
  evidence: string[];
  nextStep: string;
}

export const WEIGHT_TREND_WINDOW_DAYS = 28;
export const MIN_LOGGED_DAYS = 18;
/** This is a deliberately labelled PRODUCT HEURISTIC, NOT a validated biological cutoff. */
export const PLATEAU_HEURISTIC_PCT_PER_WEEK = 0.15;

/** Parse calendar strings in UTC without local DST drifting or accepting invalid dates. */
function calendarDay(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError("Date must be YYYY-MM-DD");
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y!, m! - 1, d!);
  const roundtrip = new Date(ms).toISOString().slice(0, 10);
  if (roundtrip !== date) throw new RangeError("Invalid calendar date");
  return Math.floor(ms / 86_400_000);
}

function quantile(sorted: number[], p: number): number {
  if (!sorted.length) throw new RangeError("No observations");
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index), hi = Math.ceil(index);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (index - lo);
}
function median(values: number[]): number {
  return quantile([...values].sort((a, b) => a - b), .5);
}

/**
 * Direction-aware assessment from real body-weight measurements.
 *
 * Median daily readings remove duplicate-day noise. A Theil–Sen estimate
 * (median pairwise slopes separated >= 7 days) avoids end-point bias.
 * Four consecutive 7-day blocks must have >=3 weigh-ins, with >=18 total.
 * It evaluates a full 28-day window; no alert from a brief flat week.
 *
 * Thresholds and coverage are engineering choices for consumer UX,
 * NOT a published/clinically validated plateau test. A plateau label does
 * not establish a metabolic adaptation or justify automatically cutting food.
 */
export function evaluateWeightTrend(
  observations: readonly WeightObservation[],
  objective: Objective,
  asOfDate: string,
): WeightTrendAnalysis {
  if (!["lose", "gain", "maintain", "recomp"].includes(objective)) {
    throw new RangeError("Unsupported weight objective");
  }
  const now = calendarDay(asOfDate);
  const byDay = new Map<number, number[]>();
  for (const entry of observations) {
    let day: number;
    try { day = calendarDay(entry.entryDate); }
    catch { continue; }
    if (!Number.isFinite(entry.weightKg) || entry.weightKg < 20 || entry.weightKg > 500 ||
        day > now || day < now - 27) continue;
    const list = byDay.get(day) ?? [];
    list.push(entry.weightKg);
    byDay.set(day, list);
  }

  const points = [...byDay.entries()]
    .map(([day, weights]) => ({ day, kg: median(weights) }))
    .sort((a, b) => a.day - b.day);
  const latest = points[points.length - 1];
  const ageDays = latest ? now - latest.day : null;
  const empty: WeightTrendAnalysis = {
    status: "insufficient_data",
    objective,
    windowDays: WEIGHT_TREND_WINDOW_DAYS,
    loggedDays: points.length,
    firstWeekMedianKg: null,
    lastWeekMedianKg: null,
    weeklyTrendKg: null,
    weeklyTrendPct: null,
    slopeIqrKgPerWeek: null,
    likelyNoise: false,
    thresholdPctPerWeek: PLATEAU_HEURISTIC_PCT_PER_WEEK,
    daysSinceLastEntry: ageDays,
    evidence: [],
    nextStep: "Weigh yourself consistently, preferably under similar morning conditions. Four weeks of regular measurements are needed before evaluating a plateau.",
  };
  const buckets = [0, 0, 0, 0];
  for (const p of points) {
    const index = Math.floor((p.day - (now - 27)) / 7);
    buckets[index] = (buckets[index] ?? 0) + 1;
  }
  if (points.length < MIN_LOGGED_DAYS || buckets.some((count) => count < 3) || ageDays === null || ageDays > 3) {
    empty.evidence.push(
      `${points.length} distinct weighing days out of 28; each seven-day block needs at least three and the latest entry must be within four days.`,
    );
    return empty;
  }

  const firstWeek = points.filter(p => p.day <= now - 21).map(p => p.kg);
  const lastWeek = points.filter(p => p.day >= now - 6).map(p => p.kg);
  const first = median(firstWeek);
  const last = median(lastWeek);
  const slopes: number[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const days = points[j]!.day - points[i]!.day;
      if (days >= 7) slopes.push(((points[j]!.kg - points[i]!.kg) / days) * 7);
    }
  }
  slopes.sort((a, b) => a - b);
  if (!slopes.length) return empty;
  const weeklyTrendKg = median(slopes);
  const middleWeight = median(points.map(p => p.kg));
  const weeklyTrendPct = (weeklyTrendKg / middleWeight) * 100;
  const slopeIqrKgPerWeek = quantile(slopes, .75) - quantile(slopes, .25);
  const dispersionPct = (slopeIqrKgPerWeek / middleWeight) * 100;
  // Adjacent medians are 21 days apart; independent sanity check on the slope.
  const endpointWeeklyPct = (((last - first) / middleWeight) * 100) / 3;
  const threshold = PLATEAU_HEURISTIC_PCT_PER_WEEK;
  const likelyNoise = dispersionPct > 0.6;
  const base = {
    ...empty,
    firstWeekMedianKg: Math.round(first * 100) / 100,
    lastWeekMedianKg: Math.round(last * 100) / 100,
    weeklyTrendKg: Math.round(weeklyTrendKg * 1000) / 1000,
    weeklyTrendPct: Math.round(weeklyTrendPct * 1000) / 1000,
    slopeIqrKgPerWeek: Math.round(slopeIqrKgPerWeek * 1000) / 1000,
    likelyNoise,
    evidence: [
      `${points.length} of 28 days with a measurement.`,
      `First and last seven-day median: ${first.toFixed(2)} to ${last.toFixed(2)} kg.`,
      `Robust trend: ${weeklyTrendPct.toFixed(2)}% of body weight per week; heuristic stall threshold: ±${threshold}%.`,
    ],
  };
  if (likelyNoise) return {
    ...base,
    status: "inconclusive",
    nextStep: "Measurements vary too much for a stable trend. Continue logging under similar conditions; don't adjust calories based on this signal alone.",
  };

  if (objective === "maintain" || objective === "recomp") {
    // Recomposition may change body composition without changing scale weight;
    // stable weight is not a negative outcome for these objectives.
    const stable = Math.abs(weeklyTrendPct) < .25 && Math.abs(endpointWeeklyPct) < .25;
    return {
      ...base,
      status: stable ? "maintenance_stable" : "maintenance_drifting",
      nextStep: stable
        ? "Your weight is broadly stable. For recomposition, track strength and waist measures as well as body weight."
        : "Weight is changing. Compare the trend with your intention and review activity, intake and measurement conditions.",
    };
  }

  const direction = objective === "gain" ? 1 : -1;
  const projected = weeklyTrendPct * direction;
  const endpointProjected = endpointWeeklyPct * direction;
  if (projected <= -threshold && endpointProjected <= -threshold) return {
    ...base,
    status: "opposite_direction",
    nextStep: "Weight is trending opposite to your goal. Review your food log and activity consistency before changing targets.",
  };

  const flat = Math.abs(weeklyTrendPct) < threshold && Math.abs(endpointWeeklyPct) < threshold;
  if (flat) return {
    ...base,
    status: "possible_plateau",
    nextStep: "Possible four-week stall, not proof of metabolic adaptation. Check intake logging, activity, sodium, hydration and other causes of water-weight changes before adjusting calories; discuss persistent concerns with a qualified professional.",
  };
  return {
    ...base,
    status: "on_track",
    nextStep: "There is a measurable trend in your intended direction or near it. Continue tracking; avoid reacting to a single weigh-in.",
  };
}

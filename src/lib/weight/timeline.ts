import type { Objective } from "@/types";
import { calculateAdultBmi } from "./energy";
import { LIMITS, withinLimit } from "@/lib/validation/limits";

export type TimelineStatus =
  | "ready"
  | "already_at_target"
  | "objective_mismatch"
  | "review_target"
  | "invalid_input"
  | "not_applicable";

export interface WeightTimeline {
  status: TimelineStatus;
  currentKg: number;
  targetKg: number;
  differenceKg: number;
  /** Range is illustrative; NOT a predicted achievement date. */
  earliestWeeks: number | null;
  latestWeeks: number | null;
  weeklyRateMinKg: number | null;
  weeklyRateMaxKg: number | null;
  method: "gain_percent_body_weight" | "loss_public_health_guidance" | "none";
  note: string;
}

function round(value: number, decimals: number): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

/**
 * A transparent planning RANGE, not a fitted model of an individual.
 *
 * Gain: 0.25–0.5% of current body mass per week from off-season
 * bodybuilding guidance for novice/intermediate lifters; integrates relative
 * changes rather than assuming an exact constant kg gain each week.
 * Loss: CDC's approximate 1–2 lb/week public-health guidance, converted
 * to kg. The rate is descriptive, never a promise or an energy prescription.
 *
 * Stable weight in maintenance/recomposition is an acceptable outcome.
 */
export function estimateWeightTimeline(input: {
  currentKg: number;
  targetKg: number;
  heightCm: number;
  objective: Objective;
}): WeightTimeline {
  const { currentKg, targetKg, heightCm, objective } = input;
  const delta = targetKg - currentKg;
  const base: WeightTimeline = {
    currentKg, targetKg, differenceKg: round(delta, 2),
    earliestWeeks: null, latestWeeks: null,
    weeklyRateMinKg: null, weeklyRateMaxKg: null, method: "none",
    status: "invalid_input",
    note: "Enter valid adult height, current weight and target weight.",
  };
  if (!withinLimit(currentKg, "weightKg") ||
      !withinLimit(targetKg, "weightKg") ||
      !withinLimit(heightCm, "heightCm") ||
      !["gain", "lose", "maintain", "recomp"].includes(objective)) return base;

  if (Math.abs(delta) < 0.05) {
    return { ...base, status: "already_at_target", note: "Your current weight is already at the selected target. Maintaining it or tracking body composition may be appropriate." };
  }
  if (objective === "maintain" || objective === "recomp") {
    return { ...base, status: "not_applicable", note: "Maintaining weight or recomposition does not imply a required change on the scale. No arrival date is predicted." };
  }
  if ((objective === "gain" && delta < 0) || (objective === "lose" && delta > 0)) {
    return { ...base, status: "objective_mismatch", note: "The target weight points in the opposite direction from your selected objective. Update your goal or target." };
  }

  const targetBmi = calculateAdultBmi(targetKg, heightCm);
  const currentBmi = calculateAdultBmi(currentKg, heightCm);
  if (objective === "lose" && (targetBmi.value < 18.5 || currentBmi.value < 18.5)) {
    return {
      ...base, status: "review_target",
      note: "A weight-loss target at or below the adult underweight BMI range needs individual assessment. No weight-loss timeline is generated.",
    };
  }

  let earliestWeeks: number;
  let latestWeeks: number;
  let weeklyRateMinKg: number;
  let weeklyRateMaxKg: number;
  let method: WeightTimeline["method"];
  let note: string;

  if (objective === "gain") {
    // Compound relative growth approximation is a planning convention,
    // not a dynamic body-composition forecast.
    const logarithm = Math.log(targetKg / currentKg);
    earliestWeeks = Math.ceil(logarithm / Math.log(1 + 0.005));
    latestWeeks = Math.ceil(logarithm / Math.log(1 + 0.0025));
    weeklyRateMinKg = currentKg * 0.0025;
    weeklyRateMaxKg = currentKg * 0.005;
    method = "gain_percent_body_weight";
    note = "Range based on an approximately 0.25–0.5% body-weight gain per week starting pace for novice/intermediate resistance trainees. This is not guaranteed muscle gain; advanced trainees may need a slower pace.";
  } else {
    const minRate = 0.45359237;
    const maxRate = 0.90718474;
    earliestWeeks = Math.ceil(Math.abs(delta) / maxRate);
    latestWeeks = Math.ceil(Math.abs(delta) / minRate);
    weeklyRateMinKg = minRate;
    weeklyRateMaxKg = maxRate;
    method = "loss_public_health_guidance";
    note = "Illustrative range from general public-health guidance of about 1–2 lb of gradual weight loss per week. Actual changes vary and slower loss may be preferable; this is not a prescribed speed.";
  }

  return {
    ...base,
    status: "ready",
    earliestWeeks: Math.max(1, earliestWeeks),
    latestWeeks: Math.max(1, latestWeeks),
    weeklyRateMinKg: round(weeklyRateMinKg, 3),
    weeklyRateMaxKg: round(weeklyRateMaxKg, 3),
    method,
    note,
  };
}

export function weightTimelineLabel(timeline: WeightTimeline): string {
  if (timeline.status !== "ready" || timeline.earliestWeeks === null || timeline.latestWeeks === null) {
    return timeline.note;
  }
  const a = timeline.earliestWeeks;
  const b = timeline.latestWeeks;
  if (a === b) return `Around ${a} week${a === 1 ? "" : "s"} at the illustrative pace`;
  if (b >= 26) {
    return `Roughly ${round(a / 4.345, 1)}–${round(b / 4.345, 1)} months at the illustrative pace`;
  }
  return `Roughly ${a}–${b} weeks at the illustrative pace`;
}

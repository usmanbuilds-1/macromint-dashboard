import type { ActivityLevel, Objective, Sex } from "@/types";
import { ACTIVITY_FACTORS, GOAL_DELTA_KCAL } from "@/lib/nutrition/constants";
import { mifflinStJeorBmr, tdee } from "@/lib/nutrition/targets";

export type AdultBmiCategory =
  | "underweight" | "healthy_range" | "overweight"
  | "obesity_class_1" | "obesity_class_2" | "obesity_class_3";

export interface AdultBmi {
  value: number;
  category: AdultBmiCategory;
  /** BMI is a screening measure, not measured adiposity or a diagnosis. */
  interpretation: "adult_screening_only";
}

export interface EnergyAssessmentInput {
  ageYears: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  objective: Objective;
}

export interface EnergyAssessment {
  bmi: AdultBmi;
  bmrKcal: number;
  /** Maintenance calories estimated by multiplying resting energy by activity. */
  maintenanceKcal: number;
  activityFactor: number;
  objectiveAdjustmentKcal: number;
  /** Null when a restrictive target would be unsuitable for an underweight adult. */
  suggestedTargetKcal: number | null;
  canAutoSuggest: boolean;
  notes: string[];
  sourceMethod: "mifflin_st_jeor_1990";
}

/** CDC adult BMI screening cutoffs. Inputs are adult height and weight in SI. */
export function calculateAdultBmi(weightKg: number, heightCm: number): AdultBmi {
  if (!Number.isFinite(weightKg) || weightKg <= 0 ||
      !Number.isFinite(heightCm) || heightCm <= 0) {
    throw new RangeError("BMI requires positive finite weight and height");
  }
  const bmi = weightKg / ((heightCm / 100) ** 2);
  let category: AdultBmiCategory;
  if (bmi < 18.5) category = "underweight";
  else if (bmi < 25) category = "healthy_range";
  else if (bmi < 30) category = "overweight";
  else if (bmi < 35) category = "obesity_class_1";
  else if (bmi < 40) category = "obesity_class_2";
  else category = "obesity_class_3";
  return { value: Math.round(bmi * 100) / 100, category, interpretation: "adult_screening_only" };
}

/**
 * Adult starting estimate, NOT an individual metabolic measurement.
 *
 * Mifflin–St Jeor predicts resting energy expenditure (often called BMR in
 * consumer apps). The activity factor and goal delta are explicit product
 * assumptions, not clinically validated personalised measurements. BMI does
 * not enter the caloric equation.
 *
 * Only ages >=20 are accepted because these are adult BMI categories;
 * pregnant/breastfeeding users and people needing specialist nutrition care
 * require an independent assessment.
 */
export function estimateAdultEnergy(input: EnergyAssessmentInput): EnergyAssessment {
  const { ageYears, sex, heightCm, weightKg, activityLevel, objective } = input;
  if (!Number.isInteger(ageYears) || ageYears < 20 || ageYears > 100 ||
      !Number.isFinite(weightKg) || weightKg < 25 || weightKg > 450 ||
      !Number.isFinite(heightCm) || heightCm < 120 || heightCm > 240 ||
      !(sex === "male" || sex === "female") ||
      !(activityLevel in ACTIVITY_FACTORS) ||
      !(objective in GOAL_DELTA_KCAL)) {
    throw new RangeError("Valid adult age, sex, height, weight, activity and objective are required");
  }

  const bmi = calculateAdultBmi(weightKg, heightCm);
  const bmrKcal = mifflinStJeorBmr({ sex, weightKg, heightCm, age: ageYears });
  const maintenanceKcal = tdee(bmrKcal, activityLevel);
  const activityFactor = ACTIVITY_FACTORS[activityLevel].factor;
  const objectiveAdjustmentKcal = GOAL_DELTA_KCAL[objective];
  const blockedDeficit = bmi.category === "underweight" && (objective === "lose" || objective === "recomp");

  const notes = [
    "BMI screens weight relative to height; it does not measure body fat or determine calories.",
    "Mifflin–St Jeor estimates resting expenditure; individual measurements can differ.",
    "The activity multiplier and goal adjustment give a starting estimate. Reassess using weight trends, not BMI alone.",
  ];
  if (blockedDeficit) {
    notes.push("An underweight BMI and a weight-loss objective conflict. No automatic calorie-deficit target was generated; seek personalised guidance.");
  }
  if (ageYears > 78) {
    notes.push("The original Mifflin–St Jeor derivation included participants aged 19–78; estimates above that age are more uncertain.");
  }
  if (bmi.category.startsWith("obesity_class")) {
    notes.push("BMI is not a diagnosis. Complex weight-management decisions may benefit from professional assessment.");
  }

  const suggestedTargetKcal = blockedDeficit
    ? null
    : Math.max(
        // Existing app floor is a policy safeguard, not a measured basal need.
        sex === "female" ? 1200 : 1500,
        maintenanceKcal + objectiveAdjustmentKcal,
      );
  return {
    bmi,
    bmrKcal,
    maintenanceKcal,
    activityFactor,
    objectiveAdjustmentKcal,
    suggestedTargetKcal,
    canAutoSuggest: !blockedDeficit,
    notes,
    sourceMethod: "mifflin_st_jeor_1990",
  };
}

import type {
  DayPlanBudget,
  DayPlanMobility,
  DayPlanPace,
  DayPlanPreferences,
  DayPlanTheme,
} from "../modules/day-planner";

export type {
  DayPlanBudget,
  DayPlanConstraints,
  DayPlanIndoorOutdoor,
  DayPlanMobility,
  DayPlanPace,
  DayPlanPreferences,
  DayPlanTheme,
} from "../modules/day-planner";

export const DAY_PLAN_MOBILITIES: readonly DayPlanMobility[] = ["walking", "motorized"];
export const DAY_PLAN_THEMES: readonly DayPlanTheme[] = [
  "romantic", "beach", "food", "culture", "nature", "shopping", "family", "nightlife", "mixed",
];
export const DAY_PLAN_BUDGETS: readonly DayPlanBudget[] = ["free", "economy", "moderate", "premium"];
export const DAY_PLAN_PACES: readonly DayPlanPace[] = ["relaxed", "balanced", "full"];

export type DayPlanPreferencesChange = (preferences: DayPlanPreferences) => void;

export const DEFAULT_DAY_PLAN_PREFERENCES: DayPlanPreferences = {
  mobility: "walking",
  radiusMeters: 5_000,
  themes: ["mixed"],
  budget: "moderate",
  pace: "balanced",
};

export function updateDayPlanPreferences(current: DayPlanPreferences, update: Partial<DayPlanPreferences>): DayPlanPreferences {
  if (update.constraints === undefined) return { ...current, ...update };
  return {
    ...current,
    ...update,
    constraints: { ...(current.constraints ?? {}), ...(update.constraints ?? {}) },
  };
}

export function toggleDayPlanTheme(themes: readonly DayPlanTheme[], theme: DayPlanTheme): DayPlanTheme[] {
  if (theme === "mixed") return ["mixed"];
  const withoutMixed = themes.filter((current) => current !== "mixed");
  const updated = withoutMixed.includes(theme)
    ? withoutMixed.filter((current) => current !== theme)
    : [...withoutMixed, theme];
  return updated.length > 0 ? updated : ["mixed"];
}

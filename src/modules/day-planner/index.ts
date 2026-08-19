import type {
  IANATimeZone,
  ItineraryItem,
  PlaceCandidate,
  UUID,
} from "../_shared/model";
import {
  isIanaTimeZone,
  isLocalDate,
  isUuid,
  parsePlaceCandidate,
} from "../_shared/validation";
import type {
  SuggestionItineraryContext,
  SuggestionWeatherContext,
} from "../trip-assistant";
import type { ItineraryModule } from "../itinerary";

export interface DayPlanItemDraft {
  candidateId: UUID;
  title: string;
  reason: string;
  localTime: string;
  durationMinutes: number;
}

export interface DayPlanDraft {
  id: UUID;
  tripId: UUID;
  stopId: UUID;
  date: string;
  items: DayPlanItemDraft[];
  /** The exact ephemeral candidates used to compose this draft. */
  candidates: PlaceCandidate[];
  createdAt: string;
}

export type DayPlanMobility = "walking" | "motorized";
export type DayPlanTheme =
  | "romantic"
  | "beach"
  | "food"
  | "culture"
  | "nature"
  | "shopping"
  | "family"
  | "nightlife"
  | "mixed";
export type DayPlanBudget = "free" | "economy" | "moderate" | "premium";
export type DayPlanPace = "relaxed" | "balanced" | "full";
export type DayPlanIndoorOutdoor = "indoor" | "outdoor" | "either";

export interface DayPlanConstraints {
  accessibility?: boolean;
  children?: boolean;
  indoorOutdoor?: DayPlanIndoorOutdoor;
  dietary?: string[];
  startTime?: string;
  endTime?: string;
}

/** Fully normalized preferences consumed by the day-planning boundary. */
export interface DayPlanPreferences {
  mobility: DayPlanMobility;
  radiusMeters: number;
  themes: DayPlanTheme[];
  budget: DayPlanBudget;
  pace: DayPlanPace;
  constraints?: DayPlanConstraints;
}

/** Partial form accepted at the UI/API boundary before normalization. */
export interface DayPlanPreferencesInput {
  mobility?: DayPlanMobility;
  radiusMeters?: number;
  themes?: DayPlanTheme[];
  budget?: DayPlanBudget;
  pace?: DayPlanPace;
  constraints?: DayPlanConstraints;
}

export interface DayPlanInput {
  tripId: UUID;
  stopId: UUID;
  date: string;
  /** Legacy free-form preferences remain supported for existing callers. */
  preferences?: string | DayPlanPreferences | DayPlanPreferencesInput;
  weather?: SuggestionWeatherContext[];
  existingItinerary?: SuggestionItineraryContext[];
  /** Ephemeral, provider-verified candidates from the current Places search. */
  candidates?: PlaceCandidate[];
}

export interface DayPlanner {
  composeDay(input: DayPlanInput): Promise<DayPlanDraft>;
}

const record = (value: unknown, name: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
};

const nonEmptyString = (value: unknown, name: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
};

const DAY_PLAN_MOBILITIES = ["walking", "motorized"] as const satisfies readonly DayPlanMobility[];
const DAY_PLAN_THEMES = [
  "romantic",
  "beach",
  "food",
  "culture",
  "nature",
  "shopping",
  "family",
  "nightlife",
  "mixed",
] as const satisfies readonly DayPlanTheme[];
const DAY_PLAN_BUDGETS = ["free", "economy", "moderate", "premium"] as const satisfies readonly DayPlanBudget[];
const DAY_PLAN_PACES = ["relaxed", "balanced", "full"] as const satisfies readonly DayPlanPace[];
const DAY_PLAN_INDOOR_OUTDOOR = ["indoor", "outdoor", "either"] as const satisfies readonly DayPlanIndoorOutdoor[];
const DEFAULT_MOBILITY: DayPlanMobility = "walking";
const DEFAULT_RADIUS_METERS = 5_000;
const MOTORIZED_DEFAULT_RADIUS_METERS = 10_000;
const MIN_RADIUS_METERS = 1_000;
const MAX_RADIUS_METERS = 20_000;
const MAX_THEMES = 5;
const MAX_DIETARY_PREFERENCES = 8;
const MAX_DIETARY_LENGTH = 80;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const enumValue = <T extends string>(value: unknown, values: readonly T[], name: string): T => {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`Invalid ${name}`);
  }
  return value as T;
};

const normalizedList = <T extends string>(
  value: unknown,
  values: readonly T[],
  name: string,
  max: number,
): T[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) throw new Error(`Invalid ${name}`);
  const result: T[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") throw new Error(`Invalid ${name}`);
    const normalized = entry.trim().toLowerCase();
    const typed = enumValue(normalized, values, name);
    if (!result.includes(typed)) result.push(typed);
  }
  return result;
};

const normalizedDietary = (value: unknown): string[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_DIETARY_PREFERENCES) {
    throw new Error("Invalid dietary preferences");
  }
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") throw new Error("Invalid dietary preferences");
    const normalized = entry.trim();
    if (normalized.length === 0 || normalized.length > MAX_DIETARY_LENGTH) {
      throw new Error("Invalid dietary preferences");
    }
    if (!result.includes(normalized)) result.push(normalized);
  }
  return result;
};

const normalizedTime = (value: unknown, name: string): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !LOCAL_TIME_PATTERN.test(value)) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
};

export function normalizeDayPlanPreferences(value: unknown = {}): DayPlanPreferences {
  const input = record(value, "Day plan preferences");
  const mobility = input.mobility === undefined
    ? DEFAULT_MOBILITY
    : enumValue(input.mobility, DAY_PLAN_MOBILITIES, "mobility");
  const radiusMeters = input.radiusMeters === undefined
    ? mobility === "motorized" ? MOTORIZED_DEFAULT_RADIUS_METERS : DEFAULT_RADIUS_METERS
    : input.radiusMeters;
  if (
    typeof radiusMeters !== "number" ||
    !Number.isSafeInteger(radiusMeters) ||
    radiusMeters < MIN_RADIUS_METERS ||
    radiusMeters > MAX_RADIUS_METERS
  ) {
    throw new Error("Invalid radiusMeters");
  }

  let themes = normalizedList(input.themes, DAY_PLAN_THEMES, "themes", MAX_THEMES);
  if (themes.length === 0) themes = ["mixed"];
  if (themes.includes("mixed") && themes.length > 1) themes = ["mixed"];

  const constraintsValue = input.constraints;
  let constraints: DayPlanConstraints | undefined;
  if (constraintsValue !== undefined) {
    const rawConstraints = record(constraintsValue, "Day plan constraints");
    const accessibility = rawConstraints.accessibility;
    const children = rawConstraints.children;
    if (accessibility !== undefined && typeof accessibility !== "boolean") {
      throw new Error("Invalid accessibility");
    }
    if (children !== undefined && typeof children !== "boolean") {
      throw new Error("Invalid children");
    }
    const startTime = normalizedTime(rawConstraints.startTime, "startTime");
    const endTime = normalizedTime(rawConstraints.endTime, "endTime");
    if (startTime !== undefined && endTime !== undefined && startTime >= endTime) {
      throw new Error("Invalid time window");
    }
    const dietary = normalizedDietary(rawConstraints.dietary);
    const indoorOutdoor = rawConstraints.indoorOutdoor === undefined
      ? undefined
      : enumValue(rawConstraints.indoorOutdoor, DAY_PLAN_INDOOR_OUTDOOR, "indoorOutdoor");
    constraints = {
      ...(accessibility === undefined ? {} : { accessibility }),
      ...(children === undefined ? {} : { children }),
      ...(indoorOutdoor === undefined ? {} : { indoorOutdoor }),
      ...(dietary.length === 0 ? {} : { dietary }),
      ...(startTime === undefined ? {} : { startTime }),
      ...(endTime === undefined ? {} : { endTime }),
    };
    if (Object.keys(constraints).length === 0) constraints = undefined;
  }

  return {
    mobility,
    radiusMeters,
    themes,
    budget: input.budget === undefined ? "moderate" : enumValue(input.budget, DAY_PLAN_BUDGETS, "budget"),
    pace: input.pace === undefined ? "balanced" : enumValue(input.pace, DAY_PLAN_PACES, "pace"),
    ...(constraints === undefined ? {} : { constraints }),
  };
}

const uuid = (value: unknown, name: string): UUID => {
  if (typeof value !== "string" || !isUuid(value)) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
};

const validLocalDate = (value: unknown, name: string): string => {
  if (typeof value !== "string" || !isLocalDate(value)) {
    throw new Error(`Invalid ${name}`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month! - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
};

const localTime = (value: unknown): string => {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error("Invalid localTime");
  }
  return value;
};

const item = (value: unknown): DayPlanItemDraft => {
  const candidate = record(value, "Day plan item");
  const durationMinutes = candidate.durationMinutes;
  if (
    typeof durationMinutes !== "number" ||
    !Number.isSafeInteger(durationMinutes) ||
    durationMinutes < 15 ||
    durationMinutes > 480
  ) {
    throw new Error("Invalid durationMinutes");
  }
  return {
    candidateId: uuid(candidate.candidateId, "candidateId"),
    title: nonEmptyString(candidate.title, "title"),
    reason: nonEmptyString(candidate.reason, "reason"),
    localTime: localTime(candidate.localTime),
    durationMinutes,
  };
};

const parseCandidates = (value: unknown): PlaceCandidate[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Day plan candidates must be an array");
  const candidates = value.map(parsePlaceCandidate);
  const ids = new Set(candidates.map((candidate) => candidate.id));
  if (ids.size !== candidates.length) {
    throw new Error("Day plan candidates must be unique");
  }
  return candidates;
};

export function parseDayPlanDraft(value: unknown): DayPlanDraft {
  const candidate = record(value, "Day plan draft");
  if (!Array.isArray(candidate.items)) throw new Error("Day plan items must be an array");
  if (candidate.items.length > 8) throw new Error("Day plan cannot contain more than 8 items");
  const items = candidate.items.map(item);
  const candidatesWereSupplied = candidate.candidates !== undefined && candidate.candidates !== null;
  const candidates = parseCandidates(candidate.candidates);
  const candidateIds = new Set(items.map((entry) => entry.candidateId));
  const times = new Set(items.map((entry) => entry.localTime));
  if (candidateIds.size !== items.length) throw new Error("Day plan candidates must be unique");
  if (times.size !== items.length) throw new Error("Day plan times must be unique");
  if (candidatesWereSupplied) {
    const availableIds = new Set(candidates.map((entry) => entry.id));
    for (const entry of items) {
      if (!availableIds.has(entry.candidateId)) {
        throw new Error(`Day plan item candidate ${entry.candidateId} is not in candidates`);
      }
    }
  }
  return {
    id: uuid(candidate.id, "day plan id"),
    tripId: uuid(candidate.tripId, "tripId"),
    stopId: uuid(candidate.stopId, "stopId"),
    date: validLocalDate(candidate.date, "date"),
    items,
    candidates,
    createdAt: nonEmptyString(candidate.createdAt, "createdAt"),
  };
}

export async function confirmDayPlan(input: {
  draft: DayPlanDraft;
  candidates: PlaceCandidate[];
  itinerary: ItineraryModule;
  timeZone: IANATimeZone;
}): Promise<ItineraryItem[]> {
  const draft = parseDayPlanDraft(input.draft);
  if (draft.items.length === 0) {
    throw new Error("Cannot confirm a day plan without at least one item");
  }
  if (!isIanaTimeZone(input.timeZone)) throw new Error("Invalid timeZone");

  const candidatesById = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const places = draft.items.map((entry) => {
    const place = candidatesById.get(entry.candidateId);
    if (!place) throw new Error(`Candidate ${entry.candidateId} is not available`);
    return { entry, place };
  });

  return Promise.all(
    places.map(({ entry, place }) =>
      input.itinerary.addConfirmedPlace({
        tripId: draft.tripId,
        stopId: draft.stopId,
        date: draft.date,
        title: entry.title,
        place,
        time: { local: entry.localTime, timeZone: input.timeZone },
        notes: entry.reason,
      }),
    ),
  );
}

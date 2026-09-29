import type { SuggestionDraft } from "../modules/trip-assistant";
import type { PlaceType } from "../modules/places";

export type AssistantCategory =
  | "Restaurants"
  | "À voir"
  | "Hébergements"
  | "Activités";

export interface AssistantSearchValues {
  query: string;
  category: AssistantCategory;
  radiusMeters?: number;
}

export const ASSISTANT_RADII = [500, 1_000, 2_000, 5_000] as const;

export function assistantCategoryPlaceType(category: AssistantCategory): PlaceType {
  if (category === "Restaurants") return "restaurant";
  if (category === "Hébergements") return "accommodation";
  if (category === "À voir") return "attraction";
  return "activity";
}

export function isAssistantRadius(value: number): boolean {
  return (ASSISTANT_RADII as readonly number[]).includes(value);
}

export function isAssistantSearchReady(values: AssistantSearchValues): boolean {
  const queryLength = values.query.trim().length;
  return queryLength === 0 || queryLength >= 2;
}

export function buildAssistantPreferences(
  category: AssistantCategory,
): string | undefined {
  const preferences: Record<AssistantCategory, string | undefined> = {
    Restaurants: "restaurant",
    "À voir": "lieu à visiter",
    Hébergements: "hébergement",
    Activités: "activité",
  };
  return preferences[category];
}

export function filterSuggestionDrafts(
  drafts: SuggestionDraft[],
  query: string,
): SuggestionDraft[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  if (!normalizedQuery) return drafts;
  return drafts.filter((draft) =>
    `${draft.title} ${draft.reason}`
      .toLocaleLowerCase("fr")
      .includes(normalizedQuery),
  );
}

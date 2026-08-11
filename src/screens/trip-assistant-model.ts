import type { SuggestionDraft } from "../modules/trip-assistant";

export type AssistantCategory =
  | "Restaurants"
  | "À voir"
  | "Hébergements"
  | "Activités";

export interface AssistantSearchValues {
  query: string;
  category: AssistantCategory;
}

export function isAssistantSearchReady(values: AssistantSearchValues): boolean {
  return values.query.trim().length >= 2;
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

import { describe, expect, it } from "vitest";
import type { SuggestionDraft } from "../modules/trip-assistant";
import type { UUID } from "../modules/_shared/model";
import {
  buildAssistantPreferences,
  filterSuggestionDrafts,
  isAssistantSearchReady,
} from "./trip-assistant-model";

const draft = (title: string, reason: string): SuggestionDraft => ({
  id: `${title}-draft` as UUID,
  tripId: "trip" as UUID,
  stopId: "stop" as UUID,
  candidateId: `${title}-candidate` as UUID,
  title,
  reason,
  createdAt: "2026-08-11T10:00:00.000Z",
});

describe("trip assistant presentation model", () => {
  it("requires a meaningful place search", () => {
    expect(
      isAssistantSearchReady({ query: "a", category: "Restaurants" }),
    ).toBe(false);
    expect(
      isAssistantSearchReady({ query: "musée", category: "À voir" }),
    ).toBe(true);
  });

  it("translates a visual category into a bounded preference", () => {
    expect(buildAssistantPreferences("Restaurants")).toBe("restaurant");
    expect(buildAssistantPreferences("Hébergements")).toBe("hébergement");
  });

  it("filters only already verified suggestion drafts", () => {
    const drafts = [
      draft("Pastéis de Belém", "Pâtisserie historique"),
      draft("Jardin tropical", "Une pause ombragée"),
    ];
    expect(filterSuggestionDrafts(drafts, "historique")).toEqual([drafts[0]]);
    expect(filterSuggestionDrafts(drafts, "inconnu")).toEqual([]);
  });
});

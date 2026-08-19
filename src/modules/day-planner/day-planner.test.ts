import { describe, expect, it, vi } from "vitest";
import type { ItineraryItem, PlaceCandidate, UUID } from "../_shared/model";
import type { ItineraryModule } from "../itinerary";
import {
  confirmDayPlan,
  normalizeDayPlanPreferences,
  parseDayPlanDraft,
  type DayPlanDraft,
} from "./index";

const tripId = "10000000-0000-4000-8000-000000000001" as UUID;
const stopId = "20000000-0000-4000-8000-000000000001" as UUID;
const firstCandidate: PlaceCandidate = {
  id: "30000000-0000-4000-8000-000000000001" as UUID,
  provider: "manual",
  name: "Musée du Louvre",
  coordinates: { latitude: 48.86, longitude: 2.33 },
};
const secondCandidate: PlaceCandidate = {
  ...firstCandidate,
  id: "30000000-0000-4000-8000-000000000002" as UUID,
  name: "Jardin des Tuileries",
};

const draft = (items = [
  {
    candidateId: firstCandidate.id,
    title: "Louvre",
    reason: "Pour la collection de peintures.",
    localTime: "10:00",
    durationMinutes: 120,
  },
]): DayPlanDraft => ({
  id: "40000000-0000-4000-8000-000000000001" as UUID,
  tripId,
  stopId,
  date: "2026-08-20",
  items,
  candidates: [firstCandidate, secondCandidate],
  createdAt: "2026-08-17T10:00:00.000Z",
});

const itinerary = (addConfirmedPlace = vi.fn(async (input) => ({
  ...input,
  id: "50000000-0000-4000-8000-000000000001" as UUID,
  time: input.time,
  place: undefined,
}))) =>
  ({
    list: vi.fn(),
    add: vi.fn(),
    addConfirmedPlace,
  }) as unknown as ItineraryModule;

describe("day planner domain", () => {
  it("normalizes walking preferences with product defaults", () => {
    expect(normalizeDayPlanPreferences({
      mobility: "walking",
      themes: ["romantic", "romantic", " culture "],
      budget: "moderate",
      pace: "balanced",
    })).toEqual({
      mobility: "walking",
      radiusMeters: 5_000,
      themes: ["romantic", "culture"],
      budget: "moderate",
      pace: "balanced",
    });
  });

  it("normalizes motorized preferences and bounded constraints", () => {
    expect(normalizeDayPlanPreferences({
      mobility: "motorized",
      radiusMeters: 12_500,
      themes: ["beach"],
      budget: "premium",
      pace: "full",
      constraints: {
        accessibility: true,
        children: false,
        indoorOutdoor: "outdoor",
        dietary: [" vegetarian ", "vegetarian", "vegan"],
        startTime: "09:30",
        endTime: "21:00",
      },
    })).toEqual({
      mobility: "motorized",
      radiusMeters: 12_500,
      themes: ["beach"],
      budget: "premium",
      pace: "full",
      constraints: {
        accessibility: true,
        children: false,
        indoorOutdoor: "outdoor",
        dietary: ["vegetarian", "vegan"],
        startTime: "09:30",
        endTime: "21:00",
      },
    });
  });

  it("defaults omitted preference dimensions and rejects invalid values", () => {
    expect(normalizeDayPlanPreferences({})).toEqual({
      mobility: "walking",
      radiusMeters: 5_000,
      themes: ["mixed"],
      budget: "moderate",
      pace: "balanced",
    });
    expect(() => normalizeDayPlanPreferences({ mobility: "cycling" })).toThrow();
    expect(() => normalizeDayPlanPreferences({ radiusMeters: 25_000 })).toThrow();
    expect(() => normalizeDayPlanPreferences({ themes: ["romantic", "unknown"] })).toThrow();
    expect(() => normalizeDayPlanPreferences({ constraints: { startTime: "9:30" } })).toThrow();
  });

  it("parses a valid draft and preserves its public shape", () => {
    expect(parseDayPlanDraft(draft())).toEqual(draft());
  });

  it("rejects malformed dates, times, durations and oversized plans, but parses an empty plan", () => {
    const invalidDrafts = [
      { ...draft(), date: "2026-02-30" },
      { ...draft(), items: [{ ...draft().items[0]!, localTime: "24:00" }] },
      { ...draft(), items: [{ ...draft().items[0]!, durationMinutes: 14 }] },
      { ...draft(), items: Array.from({ length: 9 }, (_, index) => ({ ...draft().items[0]!, candidateId: `${index}` as UUID })) },
    ];
    for (const invalid of invalidDrafts) expect(() => parseDayPlanDraft(invalid)).toThrow();
    expect(parseDayPlanDraft({ ...draft(), items: [] }).items).toEqual([]);
  });

  it("parses Google candidates and defaults missing candidates for legacy responses", () => {
    const googleCandidate = {
      ...firstCandidate,
      provider: "google" as const,
      providerPlaceId: "ChIJtest",
    };
    const parsed = parseDayPlanDraft({
      ...draft(),
      candidates: [googleCandidate],
      items: [{ ...draft().items[0]!, candidateId: googleCandidate.id }],
    });
    expect(parsed.candidates).toEqual([googleCandidate]);
    expect(parseDayPlanDraft({ ...draft(), candidates: undefined }).candidates).toEqual([]);
  });

  it("rejects an item whose candidate is absent from supplied draft candidates", () => {
    expect(() => parseDayPlanDraft({
      ...draft(),
      candidates: [secondCandidate],
    })).toThrow(/not in candidates/);
    expect(() => parseDayPlanDraft({
      ...draft(),
      candidates: [],
    })).toThrow(/not in candidates/);
  });

  it("rejects duplicate candidates, duplicate times and unknown candidates before mutating", async () => {
    const addConfirmedPlace = vi.fn();
    const module = itinerary(addConfirmedPlace);
    const duplicateCandidate = draft([
      draft().items[0]!,
      { ...draft().items[0]!, title: "Encore le Louvre", localTime: "14:00" },
    ]);
    await expect(confirmDayPlan({ draft: duplicateCandidate, candidates: [firstCandidate], itinerary: module, timeZone: "Europe/Paris" as never })).rejects.toThrow();
    expect(addConfirmedPlace).not.toHaveBeenCalled();

    const duplicateTime = draft([
      draft().items[0]!,
      { ...draft().items[0]!, candidateId: secondCandidate.id },
    ]);
    await expect(confirmDayPlan({ draft: duplicateTime, candidates: [firstCandidate, secondCandidate], itinerary: module, timeZone: "Europe/Paris" as never })).rejects.toThrow();
    expect(addConfirmedPlace).not.toHaveBeenCalled();

    await expect(confirmDayPlan({ draft: draft(), candidates: [secondCandidate], itinerary: module, timeZone: "Europe/Paris" as never })).rejects.toThrow();
    expect(addConfirmedPlace).not.toHaveBeenCalled();
  });

  it("rejects an empty plan at explicit confirmation without mutating", async () => {
    const addConfirmedPlace = vi.fn();
    await expect(confirmDayPlan({
      draft: { ...draft(), items: [] },
      candidates: [],
      itinerary: itinerary(addConfirmedPlace),
      timeZone: "Europe/Paris" as never,
    })).rejects.toThrow("at least one item");
    expect(addConfirmedPlace).not.toHaveBeenCalled();
  });

  it("confirms each verified place with the draft's local time, timezone and reason", async () => {
    const addConfirmedPlace = vi.fn(async (input) => ({
      id: `${input.title}-id` as UUID,
      tripId: input.tripId,
      stopId: input.stopId,
      title: input.title,
      date: input.date,
      time: input.time,
      notes: input.notes,
    } satisfies ItineraryItem));
    const result = await confirmDayPlan({
      draft: draft([
        draft().items[0]!,
        { ...draft().items[0]!, candidateId: secondCandidate.id, title: "Tuileries", localTime: "14:30" },
      ]),
      candidates: [firstCandidate, secondCandidate],
      itinerary: itinerary(addConfirmedPlace),
      timeZone: "Europe/Paris" as never,
    });

    expect(result).toHaveLength(2);
    expect(addConfirmedPlace).toHaveBeenNthCalledWith(1, expect.objectContaining({
      tripId,
      stopId,
      date: "2026-08-20",
      title: "Louvre",
      place: firstCandidate,
      time: { local: "10:00", timeZone: "Europe/Paris" },
      notes: "Pour la collection de peintures.",
    }));
  });
});

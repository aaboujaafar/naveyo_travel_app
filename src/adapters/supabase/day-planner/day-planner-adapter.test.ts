import { describe, expect, it, vi } from "vitest";
import { createSupabaseDayPlanner } from ".";
import type { SupabaseClientLike } from "../identity/client";
import type { DayPlanDraft, DayPlanInput } from "../../../modules/day-planner";
import type { UUID } from "../../../modules/_shared/model";

const tripId = "10000000-0000-4000-8000-000000000001" as UUID;
const stopId = "20000000-0000-4000-8000-000000000002" as UUID;

const draft: DayPlanDraft = {
  id: "30000000-0000-4000-8000-000000000003" as UUID,
  tripId,
  stopId,
  date: "2026-08-17",
  createdAt: "2026-08-17T08:00:00.000Z",
  candidates: [
    {
      id: "40000000-0000-4000-8000-000000000004" as UUID,
      provider: "geoapify",
      name: "Musée test",
      coordinates: { latitude: 36.4, longitude: 25.4 },
    },
  ],
  items: [
    {
      candidateId: "40000000-0000-4000-8000-000000000004" as UUID,
      title: "Visiter le musée",
      reason: "Proche du point de départ",
      localTime: "09:00",
      durationMinutes: 120,
    },
  ],
};

const input: DayPlanInput = {
  tripId,
  stopId,
  date: "2026-08-17",
  candidates: [
    {
      id: "40000000-0000-4000-8000-000000000004" as UUID,
      provider: "geoapify",
      name: "Musée test",
      coordinates: { latitude: 36.4, longitude: 25.4 },
    },
  ],
  existingItinerary: [{
    date: "2026-08-16",
    title: "Déjà fait",
    localTime: "14:00",
    candidateId: "50000000-0000-4000-8000-000000000005" as UUID,
    name: "Lieu historique",
    coordinates: { latitude: 36.41, longitude: 25.41 },
  }],
};

const client = (session: string | null): SupabaseClientLike =>
  ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: session ? { access_token: session } : null },
        error: null,
      }),
    },
  }) as unknown as SupabaseClientLike;

describe("AI-101 Supabase day-planner adapter", () => {
  it("rejects when authentication is absent and does not call the endpoint", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    const planner = createSupabaseDayPlanner(client(null));

    await expect(planner.composeDay(input)).rejects.toThrow(
      "Authentication is required for day planning",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("posts the input and validates the returned draft", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ draft, meta: { source: "test" } }), { status: 200 }),
    );
    const planner = createSupabaseDayPlanner(client("token-123"), "/custom/day-plan");

    await expect(
      planner.composeDay(input),
    ).resolves.toEqual(draft);
    expect(fetcher).toHaveBeenCalledWith(
      "/custom/day-plan",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(input),
      }),
    );
  });

  it("serializes the complete day-plan history without remapping it", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ draft }), { status: 200 }),
    );
    const planner = createSupabaseDayPlanner(client("token-123"), "/custom/day-plan");

    await planner.composeDay(input);

    const request = fetcher.mock.calls[0]?.[1];
    expect(request && typeof request === "object" && "body" in request ? request.body : undefined)
      .toBe(JSON.stringify(input));
  });

  it("uses body.error, then body.message, then status for HTTP errors", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    const planner = createSupabaseDayPlanner(client("token-123"));

    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Quota exceeded" }), { status: 429 }),
    );
    await expect(planner.composeDay(input)).rejects.toThrow(
      "Quota exceeded",
    );

    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Planner unavailable" }), { status: 503 }),
    );
    await expect(planner.composeDay(input)).rejects.toThrow(
      "Planner unavailable",
    );

    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 500 }));
    await expect(planner.composeDay(input)).rejects.toThrow(
      "Day planner service returned 500",
    );
  });

  it("rejects an invalid JSON response or an invalid draft", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    const planner = createSupabaseDayPlanner(client("token-123"));

    fetcher.mockResolvedValueOnce(new Response("not-json", { status: 200 }));
    await expect(planner.composeDay(input)).rejects.toThrow(
      "Day planner service returned 200",
    );

    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ draft: { nope: true } }), { status: 200 }),
    );
    await expect(planner.composeDay(input)).rejects.toThrow();
  });
});

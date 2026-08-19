import { describe, expect, it, vi } from "vitest";
import { enrichDayPlaces } from "./day-place-enrichment.ts";
import type { DiscoveredPlace } from "./day-place-discovery.ts";

const place = (provider: "geoapify" | "google", id: string): DiscoveredPlace => ({
  id: `${provider}-${id}`,
  provider,
  providerPlaceId: id,
  name: id,
  coordinates: { latitude: 36.4, longitude: 25.4 },
  attribution: provider,
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("enrichDayPlaces", () => {
  it("enriches only Geoapify candidates and preserves order", async () => {
    vi.stubGlobal("Deno", { env: { get: (name: string) => name === "GEOAPIFY_API_KEY" ? "test-key" : undefined } });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ features: [{ properties: { details: { opening_hours: "Mo-Fr 09:00-18:00" } } }] }));
    const result = await enrichDayPlaces([place("google", "g"), place("geoapify", "geo")], { fetcher });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("id=geo");
    expect(result.map((item) => item.providerPlaceId)).toEqual(["g", "geo"]);
    expect(result[1]?.openingHours?.periods).toHaveLength(5);
  });

  it("does not fail when details fail or contain no hours", async () => {
    vi.stubGlobal("Deno", { env: { get: () => "test-key" } });
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ features: [{ properties: { details: {} } }] }));
    const result = await enrichDayPlaces([place("geoapify", "one"), place("geoapify", "two")], { fetcher });
    expect(result).toEqual([place("geoapify", "one"), place("geoapify", "two")]);
  });

  it("limits candidates to 16 and never exceeds four in flight", async () => {
    vi.stubGlobal("Deno", { env: { get: () => "test-key" } });
    let active = 0;
    let maximum = 0;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return json({ features: [{ properties: { details: { opening_hours: "Mo 09:00-10:00" } } }] });
    });
    const result = await enrichDayPlaces(Array.from({ length: 20 }, (_, index) => place("geoapify", String(index))), { fetcher });
    expect(result).toHaveLength(16);
    expect(fetcher).toHaveBeenCalledTimes(16);
    expect(maximum).toBeLessThanOrEqual(4);
    expect(result.map((item) => item.providerPlaceId)).toEqual(Array.from({ length: 16 }, (_, index) => String(index)));
  });
});

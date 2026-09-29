import { describe, expect, it } from "vitest";
import { createGeoapifyPlacesProvider } from "../../src/adapters/geoapify";

const response = {
  features: [{
    properties: {
      place_id: "city-1",
      name: "Lisbon",
      formatted: "Lisbon, Portugal",
      country_code: "pt",
      timezone: { name: "Europe/Lisbon" },
    },
    geometry: { coordinates: [-9.14, 38.72] },
  }],
};

describe("GeoapifyPlacesProvider", () => {
  it("routes autocomplete, reverse and nearby operations", async () => {
    const calls: string[] = [];
    const provider = createGeoapifyPlacesProvider("https://gateway.test", async () => "token");
    // The public factory is transport-backed; replace fetch to assert the wire operation.
    const original = globalThis.fetch;
    globalThis.fetch = (async (_input, init) => {
      calls.push(String((init?.body && JSON.parse(String(init.body)).operation) ?? ""));
      return new Response(JSON.stringify(response), { status: 200 });
    }) as typeof fetch;
    try {
      await provider.autocomplete({ query: "Lis" });
      await provider.reverse({ coordinates: { latitude: 38.72, longitude: -9.14 } });
      await provider.nearby({ coordinates: { latitude: 38.72, longitude: -9.14 } });
    } finally {
      globalThis.fetch = original;
    }
    expect(calls).toEqual(["autocomplete", "reverse", "nearby"]);
  });

  it("does not call transport for too-short autocomplete", async () => {
    const provider = createGeoapifyPlacesProvider("https://gateway.test", async () => "token");
    await expect(provider.autocomplete({ query: " " })).resolves.toEqual([]);
  });

  it("maps discovery types to Geoapify nearby categories", async () => {
    let body: Record<string, unknown> | undefined;
    const provider = createGeoapifyPlacesProvider("https://gateway.test", async () => "token");
    const original = globalThis.fetch;
    globalThis.fetch = (async (_input, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify(response), { status: 200 });
    }) as typeof fetch;
    try {
      await provider.nearby({ coordinates: { latitude: 38.72, longitude: -9.14 }, type: "attraction" });
    } finally {
      globalThis.fetch = original;
    }
    expect(body?.categories).toEqual(["tourism.sights", "tourism.attraction"]);
  });
});

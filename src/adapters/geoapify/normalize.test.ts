import { describe, expect, it } from "vitest";
import { normalizeGeoapifyResponse } from "./normalize";

const feature = (properties: Record<string, unknown>) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [-9.1334, 38.7139] },
  properties: { place_id: "geo-1", name: "Museu", formatted: "Museu, Lisboa", country_code: "pt", ...properties },
});

describe("Geoapify normalization", () => {
  it("keeps the most specific category of the first family", () => {
    const [place] = normalizeGeoapifyResponse({
      features: [feature({ categories: ["catering", "catering.restaurant", "catering.restaurant.portuguese", "building"] })],
    });
    expect(place?.category).toBe("catering.restaurant.portuguese");
  });

  it("keeps OpenStreetMap opening hours as text", () => {
    const [withHours] = normalizeGeoapifyResponse({ features: [feature({ opening_hours: "Tu-Su 10:00-18:00" })] });
    expect(withHours?.openingHours).toEqual({ sourceText: "Tu-Su 10:00-18:00" });
    const [fromRaw] = normalizeGeoapifyResponse({ features: [feature({ datasource: { raw: { opening_hours: "24/7" } } })] });
    expect(fromRaw?.openingHours).toEqual({ sourceText: "24/7" });
    const [without] = normalizeGeoapifyResponse({ features: [feature({})] });
    expect(without?.openingHours).toBeUndefined();
  });
});

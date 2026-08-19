import { describe, expect, it } from "vitest";
import {
  DEFAULT_GEOAPIFY_ATTRIBUTION,
  DEFAULT_GOOGLE_ATTRIBUTION,
  placeAttribution,
} from "./attribution";

describe("place attribution", () => {
  it("preserves provider attribution when present", () => {
    expect(placeAttribution("geoapify", "  Custom attribution  ")).toBe(
      "Custom attribution",
    );
  });

  it("supplies legally visible Geoapify/OpenStreetMap attribution by default", () => {
    expect(placeAttribution("geoapify")).toBe(DEFAULT_GEOAPIFY_ATTRIBUTION);
    expect(placeAttribution("geoapify", "   ")).toBe(
      DEFAULT_GEOAPIFY_ATTRIBUTION,
    );
  });

  it("does not label manually entered places as provider data", () => {
    expect(placeAttribution("manual")).toBeUndefined();
  });

  it("labels Google Places candidates", () => {
    expect(placeAttribution("google")).toBe(DEFAULT_GOOGLE_ATTRIBUTION);
  });
});

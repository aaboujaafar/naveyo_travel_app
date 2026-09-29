import { describe, expect, it } from "vitest";
import { isExpoMapsModule } from "./expo-maps-module";

describe("expo-maps runtime module detection", () => {
  it("accepts the forwardRef object exported by AppleMaps.View", () => {
    expect(
      isExpoMapsModule({
        AppleMaps: { View: { $$typeof: Symbol.for("react.forward_ref") } },
      }),
    ).toBe(true);
  });

  it("rejects an incomplete module export", () => {
    expect(isExpoMapsModule({ AppleMaps: {} })).toBe(false);
    expect(isExpoMapsModule(null)).toBe(false);
  });
});

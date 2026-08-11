import { describe, expect, it } from "vitest";
import { colors } from "./colors";
import { layout } from "./layout";
import { motion } from "./motion";
import { radius } from "./radius";
import { spacing } from "./spacing";

describe("template design tokens", () => {
  it("locks the HTML reference geometry", () => {
    expect(layout).toMatchObject({
      referenceWidth: 390,
      maxMobileWidth: 430,
      screenHorizontalPadding: 24,
      bottomNavigationReserve: 80,
      minimumTouchTarget: 44,
    });
  });

  it("matches the design-system spacing and radii", () => {
    expect(spacing).toEqual({ xs: 4, sm: 8, md: 16, lg: 24, xl: 32, "2xl": 48 });
    expect(radius).toEqual({ sm: 10, md: 16, lg: 24, full: 999 });
  });

  it("locks the primary palette and press motion", () => {
    expect(colors).toMatchObject({
      bg: "#faf8f6",
      surface: "#ffffff",
      fg: "#1a1a2e",
      accent: "#e05a3a",
      teal: "#2a8f8f",
      gold: "#c99a2e",
    });
    expect(motion.press).toEqual({ durationMs: 150, scale: 0.97 });
  });
});

import { describe, expect, it } from "vitest";
import {
  nextOnboardingSlide,
  normalizeOnboardingSlide,
  onboardingCtaTarget,
  onboardingSections,
  onboardingSlides,
  requestsPermissionOnFirstVisit,
  shouldShowOnboarding,
} from "./onboarding-model";

describe("onboarding contract", () => {
  it("keeps the active slide within the carousel", () => {
    expect(normalizeOnboardingSlide(-1)).toBe(0);
    expect(normalizeOnboardingSlide(99)).toBe(onboardingSlides.length - 1);
    expect(nextOnboardingSlide(onboardingSlides.length - 1)).toBe(0);
  });

  it("does not auto-advance when reduced motion is enabled", () => {
    expect(nextOnboardingSlide(1, onboardingSlides.length, true)).toBe(1);
  });

  it("routes the two CTAs without requesting permissions", () => {
    expect(onboardingCtaTarget("create-trip")).toBe("/(auth)/sign-up");
    expect(onboardingCtaTarget("sign-in")).toBe("/(auth)/sign-in");
    expect(requestsPermissionOnFirstVisit()).toBe(false);
  });

  it("shows onboarding only for a first visit and marks recap as future", () => {
    expect(shouldShowOnboarding(true)).toBe(true);
    expect(shouldShowOnboarding(false)).toBe(false);
    expect(onboardingSections.find((section) => section.id === "recap")?.availability).toBe("coming-soon");
  });
});

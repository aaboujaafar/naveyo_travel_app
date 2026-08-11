import { describe, expect, it, vi } from "vitest";
import {
  createOnboardingState,
  resolveOnboardingEntryRoute,
  type OnboardingStateStorage,
} from "./onboarding-state";

function storageWith(value: string | null): OnboardingStateStorage {
  return {
    getItemAsync: vi.fn(async () => value),
    setItemAsync: vi.fn(async () => undefined),
  };
}

describe("onboarding state", () => {
  it("treats a missing or unknown value as a first launch", async () => {
    await expect(createOnboardingState(storageWith(null)).hasSeenIntroduction()).resolves.toBe(false);
    await expect(createOnboardingState(storageWith("unexpected")).hasSeenIntroduction()).resolves.toBe(false);
  });

  it("recognizes only the persisted introduction marker", async () => {
    await expect(createOnboardingState(storageWith("seen")).hasSeenIntroduction()).resolves.toBe(true);
  });

  it("persists only the introduction marker", async () => {
    const storage = storageWith(null);
    await createOnboardingState(storage).markIntroductionSeen();
    expect(storage.setItemAsync).toHaveBeenCalledOnce();
    expect(storage.setItemAsync).toHaveBeenCalledWith(
      "naveyo.introduction-seen.v1",
      "seen",
    );
  });

  it("routes a first launch, an existing account and an active session", () => {
    expect(resolveOnboardingEntryRoute({ isAuthenticated: false, hasSeenIntroduction: false })).toBe("/(auth)/onboarding");
    expect(resolveOnboardingEntryRoute({ isAuthenticated: false, hasSeenIntroduction: true })).toBe("/(auth)/sign-in");
    expect(resolveOnboardingEntryRoute({ isAuthenticated: true, hasSeenIntroduction: false })).toBe("/(app)");
  });
});

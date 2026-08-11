const introductionSeenKey = "naveyo.introduction-seen.v1";

export interface OnboardingStateStorage {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
}

export interface OnboardingState {
  hasSeenIntroduction(): Promise<boolean>;
  markIntroductionSeen(): Promise<void>;
}

export type OnboardingEntryRoute =
  | "/(auth)/onboarding"
  | "/(auth)/sign-in"
  | "/(app)";

export function resolveOnboardingEntryRoute(input: {
  isAuthenticated: boolean;
  hasSeenIntroduction: boolean;
}): OnboardingEntryRoute {
  if (input.isAuthenticated) return "/(app)";
  return input.hasSeenIntroduction
    ? "/(auth)/sign-in"
    : "/(auth)/onboarding";
}

export function createOnboardingState(
  storage: OnboardingStateStorage,
): OnboardingState {
  return {
    async hasSeenIntroduction() {
      return (await storage.getItemAsync(introductionSeenKey)) === "seen";
    },
    async markIntroductionSeen() {
      await storage.setItemAsync(introductionSeenKey, "seen");
    },
  };
}

const secureStoreStorage: OnboardingStateStorage = {
  async getItemAsync(key) {
    const secureStore = await import("expo-secure-store");
    return secureStore.getItemAsync(key);
  },
  async setItemAsync(key, value) {
    const secureStore = await import("expo-secure-store");
    await secureStore.setItemAsync(key, value);
  },
};

export const onboardingState = createOnboardingState(secureStoreStorage);

import { useRouter } from "expo-router";
import { useRef } from "react";
import { onboardingState } from "../../src/bootstrap/onboarding-state";
import { OnboardingScreen } from "../../src/screens/OnboardingScreen";

export default function OnboardingRoute() {
  const router = useRouter();
  const completion = useRef<Promise<void> | null>(null);

  const complete = () => {
    completion.current ??= onboardingState.markIntroductionSeen();
  };

  const continueTo = async (route: "/(auth)/sign-up" | "/(auth)/sign-in") => {
    complete();
    try {
      await completion.current;
    } catch {
      // A storage failure must not trap the person on the introduction screen.
    } finally {
      router.replace(route);
    }
  };

  return (
    <OnboardingScreen
      onComplete={complete}
      onCreateAccount={() => void continueTo("/(auth)/sign-up")}
      onExistingAccount={() => void continueTo("/(auth)/sign-in")}
    />
  );
}

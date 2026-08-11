import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import {
  onboardingState,
  resolveOnboardingEntryRoute,
} from "../../src/bootstrap/onboarding-state";
import { useShellSession } from "../../src/ui";

export default function AuthIndex() {
  const { isAuthenticated, isReady } = useShellSession();
  const [hasSeenIntroduction, setHasSeenIntroduction] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    void onboardingState.hasSeenIntroduction().then((hasSeen) => {
      if (mounted) setHasSeenIntroduction(hasSeen);
    }).catch(() => {
      if (mounted) setHasSeenIntroduction(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!isReady || hasSeenIntroduction === null) return null;
  return <Redirect href={resolveOnboardingEntryRoute({ isAuthenticated, hasSeenIntroduction })} />;
}

export type OnboardingCta = "create-trip" | "sign-in";
export type OnboardingAvailability = "available" | "coming-soon";

export interface OnboardingSlide {
  id: "collaboration" | "assistant" | "offline";
  title: string;
  description: string;
  availability: OnboardingAvailability;
}

export interface OnboardingSection {
  id: "features" | "how-it-works" | "recap" | "permissions";
  availability: OnboardingAvailability;
}

export const onboardingSlides: readonly OnboardingSlide[] = [
  { id: "collaboration", title: "Préparez votre Voyage ensemble", description: "Un espace privé pour organiser les Étapes, lieux et Réservations.", availability: "available" },
  { id: "assistant", title: "Découvrez de vrais lieux", description: "Des Suggestions IA issues de candidats contrôlés, à confirmer humainement.", availability: "available" },
  { id: "offline", title: "Consultez sans réseau", description: "Un paquet de Voyage téléchargé reste consultable hors connexion.", availability: "available" },
];

export const onboardingSections: readonly OnboardingSection[] = [
  { id: "features", availability: "available" },
  { id: "how-it-works", availability: "available" },
  { id: "recap", availability: "coming-soon" },
  { id: "permissions", availability: "available" },
];

export function normalizeOnboardingSlide(index: number, count = onboardingSlides.length): number {
  if (count <= 0 || !Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.trunc(index), 0), count - 1);
}

export function nextOnboardingSlide(index: number, count = onboardingSlides.length, reducedMotion = false): number {
  if (reducedMotion) return normalizeOnboardingSlide(index, count);
  return count > 0 ? (normalizeOnboardingSlide(index, count) + 1) % count : 0;
}

export function shouldShowOnboarding(firstVisit: boolean): boolean {
  return firstVisit;
}

export function onboardingCtaTarget(cta: OnboardingCta): "/(auth)/sign-up" | "/(auth)/sign-in" {
  return cta === "create-trip" ? "/(auth)/sign-up" : "/(auth)/sign-in";
}

export function requestsPermissionOnFirstVisit(): false {
  return false;
}

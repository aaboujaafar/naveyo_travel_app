/**
 * Attribution required for Geoapify results (which are based on OpenStreetMap
 * data). Keep this in one place so saved places and provider responses use the
 * same copy, including when the provider omits datasource.attribution.
 */
export const DEFAULT_GEOAPIFY_ATTRIBUTION = "Powered by Geoapify · © OpenStreetMap contributors";
export const DEFAULT_GOOGLE_ATTRIBUTION = "Google Maps";

export function placeAttribution(
  provider: "geoapify" | "google" | "manual" | undefined,
  attribution?: string | null,
): string | undefined {
  const value = attribution?.trim();
  if (value) return value;
  if (provider === "geoapify") return DEFAULT_GEOAPIFY_ATTRIBUTION;
  if (provider === "google") return DEFAULT_GOOGLE_ATTRIBUTION;
  return undefined;
}

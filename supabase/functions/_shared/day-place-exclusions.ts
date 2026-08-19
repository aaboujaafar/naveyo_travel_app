import type { DiscoveredPlace, DayPlaceProvider } from "./day-place-discovery.ts";
import { haversineDistanceMeters } from "./day-place-discovery.ts";

export type UsedPlaceIdentity = {
  candidateId?: string;
  provider?: DayPlaceProvider;
  providerPlaceId?: string;
  name?: string;
  coordinates?: { latitude: number; longitude: number };
};

const providers = new Set<DayPlaceProvider>(["google", "geoapify"]);

const nonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const result = value.trim();
  return result.length > 0 ? result : undefined;
};

const normalizeName = (value: unknown): string | undefined => {
  const name = nonEmptyString(value);
  if (!name) return undefined;
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ") || undefined;
};

const validCoordinates = (value: unknown): value is { latitude: number; longitude: number } => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const coordinates = value as Record<string, unknown>;
  return typeof coordinates.latitude === "number" && Number.isFinite(coordinates.latitude) &&
    coordinates.latitude >= -90 && coordinates.latitude <= 90 &&
    typeof coordinates.longitude === "number" && Number.isFinite(coordinates.longitude) &&
    coordinates.longitude >= -180 && coordinates.longitude <= 180;
};

const usableProvider = (value: unknown): value is DayPlaceProvider =>
  typeof value === "string" && providers.has(value as DayPlaceProvider);

const exactProviderIdentity = (value: UsedPlaceIdentity): string | undefined => {
  if (!usableProvider(value.provider)) return undefined;
  const providerPlaceId = nonEmptyString(value.providerPlaceId);
  return providerPlaceId ? `${value.provider}:${providerPlaceId}` : undefined;
};

const isPreviouslyUsed = (candidate: DiscoveredPlace, history: UsedPlaceIdentity[]): boolean => {
  const candidateId = nonEmptyString(candidate?.id);
  const candidateProviderIdentity = exactProviderIdentity({
    provider: candidate?.provider,
    providerPlaceId: candidate?.providerPlaceId,
  });
  const candidateName = normalizeName(candidate?.name);
  const candidateCoordinates = validCoordinates(candidate?.coordinates) ? candidate.coordinates : undefined;

  return history.some((used) => {
    if (!used || typeof used !== "object" || Array.isArray(used)) return false;

    const usedCandidateId = nonEmptyString(used.candidateId);
    if (candidateId && usedCandidateId === candidateId) return true;

    const usedProviderIdentity = exactProviderIdentity(used);
    if (candidateProviderIdentity && usedProviderIdentity === candidateProviderIdentity) return true;

    const usedName = normalizeName(used.name);
    if (!candidateName || !usedName || candidateName !== usedName) return false;

    if (!validCoordinates(used.coordinates)) return true;
    return Boolean(candidateCoordinates && haversineDistanceMeters(candidateCoordinates, used.coordinates) <= 100);
  });
};

export function excludePreviouslyUsedPlaces(
  candidates: DiscoveredPlace[],
  history: UsedPlaceIdentity[],
): DiscoveredPlace[] {
  if (!Array.isArray(candidates) || !Array.isArray(history) || history.length === 0) return candidates;
  return candidates.filter((candidate) => !isPreviouslyUsed(candidate, history));
}

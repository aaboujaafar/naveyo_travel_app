import type { PlaceCandidate, UUID } from "../../modules/_shared/model";
import {
  assertStableId,
  isIanaTimeZone,
  parseCoordinates,
} from "../../modules/_shared/validation";
import { placeAttribution } from "../../modules/places/attribution";

export type GeoapifyFeature = {
  properties?: Record<string, unknown>;
  geometry?: { coordinates?: unknown };
};

export type GeoapifyResponse = { features?: unknown };
export type NormalizedPlaceCandidate = PlaceCandidate & {
  attribution?: string;
  providerPlaceId?: string;
};

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

/** Keeps the deepest category of the first family, e.g. `catering.restaurant.portuguese`. */
function mostSpecificCategory(values: unknown[]): string | undefined {
  const categories = values.map(text).filter((value): value is string => value !== undefined);
  const family = categories[0]?.split(".")[0];
  if (!family) return undefined;
  return categories
    .filter((value) => value === family || value.startsWith(`${family}.`))
    .reduce((best, value) => (value.split(".").length > best.split(".").length ? value : best));
}

const stableId = (providerId: string): UUID => {
  let first = 2166136261;
  let second = 2246822519;
  for (const char of providerId) {
    first = Math.imul(first ^ char.charCodeAt(0), 16777619);
    second = Math.imul(second ^ char.charCodeAt(0), 3266489917);
  }
  return assertStableId(
    `${Math.abs(first).toString(16).padStart(8, "0")}-${Math.abs(second).toString(16).padStart(8, "0").slice(0, 4)}-5000-8000-000000000000`,
  );
};

export function normalizeGeoapifyResponse(
  value: unknown,
): NormalizedPlaceCandidate[] {
  const features =
    value && typeof value === "object"
      ? (value as GeoapifyResponse).features
      : undefined;
  if (!Array.isArray(features)) throw new Error("Invalid Geoapify response");
  const result: NormalizedPlaceCandidate[] = [];
  for (const feature of features as unknown[]) {
    if (!feature || typeof feature !== "object")
      throw new Error("Invalid Geoapify feature");
    const item = feature as GeoapifyFeature;
    const properties = item.properties;
    const coordinates = item.geometry?.coordinates;
    if (
      !properties ||
      typeof properties !== "object" ||
      !Array.isArray(coordinates) ||
      coordinates.length < 2
    )
      throw new Error("Invalid Geoapify place");
    const providerId = text(properties.place_id);
    const name = text(properties.name) ?? text(properties.formatted);
    const longitude = coordinates[0];
    const latitude = coordinates[1];
    if (
      !providerId ||
      !name ||
      typeof longitude !== "number" ||
      typeof latitude !== "number"
    )
      throw new Error("Incomplete Geoapify place");
    const category = Array.isArray(properties.categories)
      ? mostSpecificCategory(properties.categories)
      : text(properties.category);
    const datasource = properties.datasource as Record<string, unknown> | undefined;
    const imageUrl = text(properties.image) ?? text(properties.photo) ?? text(datasource?.image);
    const imageCredit = (() => {
      const value = properties.image_credit;
      if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
      const credit = value as Record<string, unknown>;
      const photographer = text(credit.photographer);
      const photographerUrl = text(credit.photographerUrl);
      const sourceUrl = text(credit.sourceUrl);
      if (!photographer || !photographerUrl || !sourceUrl) return undefined;
      return { photographer, photographerUrl, sourceUrl };
    })();
    result.push({
      id: stableId(providerId),
      provider: "geoapify",
      name,
      ...(imageUrl ? { imageUrl } : {}),
      ...(imageCredit ? { imageCredit } : {}),
      category,
      address: text(properties.formatted),
      countryCode: text(properties.country_code)?.toUpperCase(),
      coordinates: parseCoordinates({ latitude, longitude }),
      attribution: placeAttribution(
        "geoapify",
        text(properties.attribution) ??
          text(
            datasource?.attribution,
          ),
      ),
      providerPlaceId: providerId,
      timeZone: (() => {
        const timezone = properties.timezone;
        const value = timezone && typeof timezone === "object"
          ? (timezone as Record<string, unknown>).name
          : timezone;
        return typeof value === "string" && isIanaTimeZone(value) ? value : undefined;
      })(),
      distanceMeters:
        typeof properties.distance === "number" && Number.isFinite(properties.distance) && properties.distance >= 0
          ? properties.distance
          : undefined,
    });
  }
  return result;
}

export function geoapifyProviderId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.trim().length < 1 ||
    value.length > 512
  )
    throw new Error("Invalid provider place id");
  return value.trim();
}

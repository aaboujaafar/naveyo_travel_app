import type { Coordinates } from "../modules/_shared/model";

export interface MapsLinkPlace {
  name?: string;
  coordinates?: Coordinates;
  source: "google" | "apple";
}

/** Short links only reveal the place once their redirection has been followed. */
export function isShortMapsLink(value: string): boolean {
  return /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|maps\.apple\/p)\//i.test(value.trim());
}

/**
 * Reads a place out of a Google Maps or Apple Plans link: its name and, when
 * the link carries them, its coordinates. Returns null for anything else.
 */
export function parseMapsLink(value: string): MapsLinkPlace | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();

  // EU visitors are first sent to a consent page that carries the real link.
  if (host === "consent.google.com") {
    const target = url.searchParams.get("continue");
    return target ? parseMapsLink(target) : null;
  }

  if (/(^|\.)google\.[a-z.]+$/.test(host) || host === "maps.google.com" || host === "maps.app.goo.gl") {
    const path = decodeURIComponent(url.pathname.replace(/\+/g, " "));
    const name = /\/maps\/place\/([^/@]+)/.exec(path)?.[1]?.trim()
      ?? textQuery(url.searchParams.get("query") ?? url.searchParams.get("q"));
    // "!3d38.7!4d-9.1" is the pin itself; "@38.7,-9.1" is only the map centre.
    const pin = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(url.href);
    const centre = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(path);
    const coordinates = toCoordinates(pin?.[1], pin?.[2])
      ?? coordinatesQuery(url.searchParams.get("query") ?? url.searchParams.get("q"))
      ?? toCoordinates(...(url.searchParams.get("ll")?.split(",") ?? []))
      ?? toCoordinates(centre?.[1], centre?.[2]);
    return name || coordinates ? { source: "google", ...(name ? { name } : {}), ...(coordinates ? { coordinates } : {}) } : null;
  }

  if (host === "maps.apple.com" || host === "maps.apple") {
    const name = url.searchParams.get("name") ?? textQuery(url.searchParams.get("q")) ?? url.searchParams.get("address") ?? undefined;
    const coordinates = toCoordinates(...(url.searchParams.get("coordinate")?.split(",") ?? []))
      ?? toCoordinates(...(url.searchParams.get("ll")?.split(",") ?? []))
      ?? coordinatesQuery(url.searchParams.get("q"));
    return name || coordinates ? { source: "apple", ...(name ? { name: name.trim() } : {}), ...(coordinates ? { coordinates } : {}) } : null;
  }
  return null;
}

/** Picks the found place whose name is closest to the link's name. */
export function bestNameMatch<T extends { name: string }>(candidates: readonly T[], name: string | undefined): T | undefined {
  if (!name) return candidates[0];
  const wanted = normalize(name);
  const scored = candidates.map((candidate) => {
    const found = normalize(candidate.name);
    const score = found === wanted ? 3 : found.includes(wanted) || wanted.includes(found) ? 2 : sharedWords(found, wanted) > 0 ? 1 : 0;
    return { candidate, score };
  });
  const best = scored.reduce<{ candidate: T; score: number } | undefined>((current, item) => (!current || item.score > current.score ? item : current), undefined);
  return best && best.score > 0 ? best.candidate : undefined;
}

function textQuery(value: string | null): string | undefined {
  const text = value?.trim();
  return text && !coordinatesQuery(text) ? text : undefined;
}

function coordinatesQuery(value: string | null): Coordinates | undefined {
  const match = value ? /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(value) : null;
  return match ? toCoordinates(match[1], match[2]) : undefined;
}

function toCoordinates(latitude?: string, longitude?: string): Coordinates | undefined {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (latitude === undefined || longitude === undefined || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined;
  return { latitude: lat, longitude: lon };
}

function sharedWords(left: string, right: string): number {
  const words = new Set(left.split(" ").filter((word) => word.length > 2));
  return right.split(" ").filter((word) => words.has(word)).length;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

import type { Coordinates, UUID } from "../_shared/model";

export type TransitNetworkKind = "metro" | "light-rail" | "tram" | "suburban";

/** A public transport network near a Stop, with the map published for it. */
export interface TransitMapCandidate {
  /** Wikidata item of the network, e.g. "Q50716". */
  networkId: string;
  name: string;
  kind: TransitNetworkKind;
  /** Commons file name of the network map. */
  fileName: string;
  distanceKm: number;
}

export interface SavedTransitMap {
  networkId: string;
  tripId: UUID;
  stopId: UUID;
  name: string;
  kind: TransitNetworkKind;
  /** Local file, readable offline. */
  localUri: string;
  width: number;
  height: number;
  attribution: { author: string; license: string; licenseUrl?: string; sourceUrl: string };
  savedAt: string;
  sizeBytes: number;
}

export interface TransitMapsModule {
  find(coordinates: Coordinates): Promise<TransitMapCandidate[]>;
  download(input: { tripId: UUID; stopId: UUID; candidate: TransitMapCandidate }): Promise<SavedTransitMap>;
  list(tripId: UUID): Promise<SavedTransitMap[]>;
  remove(tripId: UUID, networkId: string): Promise<void>;
}

export const TRANSIT_KIND_LABELS: Record<TransitNetworkKind, string> = {
  metro: "Métro",
  "light-rail": "Métro léger",
  tram: "Tramway",
  suburban: "Train de banlieue",
};

/** Wikidata classes of whole networks (not single lines), mapped to our kinds. */
export const NETWORK_CLASSES: Record<string, TransitNetworkKind> = {
  Q5503: "metro",
  Q1268865: "light-rail",
  Q1412403: "tram",
  Q95723: "suburban",
  Q2575376: "suburban",
};

/** Networks whose city lies within this distance of the Stop are proposed. */
export const SEARCH_RADIUS_KM = 25;

export function transitMapsQuery(coordinates: Coordinates): string {
  const classes = Object.keys(NETWORK_CLASSES).map((id) => `wd:${id}`).join(" ");
  // The network is located in a place (city, borough…) whose coordinates are near the Stop.
  return `SELECT ?system ?systemLabel ?kind ?route ?detail ?dist WHERE {
  SERVICE wikibase:around {
    ?place wdt:P625 ?where .
    bd:serviceParam wikibase:center "Point(${coordinates.longitude} ${coordinates.latitude})"^^geo:wktLiteral ;
                    wikibase:radius "${SEARCH_RADIUS_KM}" ;
                    wikibase:distance ?dist .
  }
  VALUES ?kind { ${classes} }
  ?system wdt:P31 ?kind ; wdt:P131 ?place .
  OPTIONAL { ?system wdt:P15 ?route }
  OPTIONAL { ?system wdt:P1621 ?detail }
  FILTER(BOUND(?route) || BOUND(?detail))
  FILTER NOT EXISTS { ?system wdt:P576 ?dissolved }
  FILTER NOT EXISTS { ?system wdt:P3999 ?closed }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
LIMIT 60`;
}

type Binding = Record<string, { value: string } | undefined>;

/** One candidate per network, closest first, the route map preferred over the detailed map. */
export function parseTransitMapsResults(json: unknown, limit = 6): TransitMapCandidate[] {
  const bindings = (json as { results?: { bindings?: Binding[] } } | null)?.results?.bindings;
  if (!Array.isArray(bindings)) return [];
  const byNetwork = new Map<string, TransitMapCandidate>();
  for (const binding of bindings) {
    const networkId = idOf(binding.system?.value);
    const kind = NETWORK_CLASSES[idOf(binding.kind?.value) ?? ""];
    const fileName = fileNameOf(binding.route?.value) ?? fileNameOf(binding.detail?.value);
    const distanceKm = Number(binding.dist?.value);
    const name = binding.systemLabel?.value?.trim();
    if (!networkId || !kind || !fileName || !name || /^Q\d+$/.test(name) || !Number.isFinite(distanceKm)) continue;
    const existing = byNetwork.get(networkId);
    if (!existing || distanceKm < existing.distanceKm) byNetwork.set(networkId, { networkId, name: capitalize(name), kind, fileName, distanceKm });
  }
  const order: TransitNetworkKind[] = ["metro", "light-rail", "tram", "suburban"];
  return [...byNetwork.values()]
    .sort((left, right) => left.distanceKm - right.distanceKm || order.indexOf(left.kind) - order.indexOf(right.kind))
    .slice(0, limit);
}

export interface CommonsImage {
  url: string;
  width: number;
  height: number;
  author: string;
  license: string;
  licenseUrl?: string;
  sourceUrl: string;
}

/** Reads the Commons imageinfo answer: a rendering at most 3840 px wide, and who to credit. */
export function parseCommonsImageInfo(json: unknown): CommonsImage | null {
  const pages = (json as { query?: { pages?: Record<string, { imageinfo?: Record<string, unknown>[] }> } } | null)?.query?.pages;
  const info = pages ? Object.values(pages)[0]?.imageinfo?.[0] : undefined;
  if (!info) return null;
  const metadata = (info.extmetadata ?? {}) as Record<string, { value?: string } | undefined>;
  const url = typeof info.thumburl === "string" ? info.thumburl : typeof info.url === "string" ? info.url : null;
  const width = Number(info.thumbwidth ?? info.width);
  const height = Number(info.thumbheight ?? info.height);
  const license = stripHtml(metadata.LicenseShortName?.value);
  if (!url || !Number.isFinite(width) || !Number.isFinite(height) || !license) return null;
  return {
    url,
    width,
    height,
    author: stripHtml(metadata.Artist?.value) || "Contributeurs Wikimedia Commons",
    license,
    ...(metadata.LicenseUrl?.value ? { licenseUrl: metadata.LicenseUrl.value } : {}),
    sourceUrl: typeof info.descriptionurl === "string" ? info.descriptionurl : "https://commons.wikimedia.org",
  };
}

function idOf(uri: string | undefined): string | undefined {
  return uri ? /\/(Q\d+)$/.exec(uri)?.[1] : undefined;
}

function fileNameOf(uri: string | undefined): string | undefined {
  const raw = uri?.split("Special:FilePath/")[1];
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function stripHtml(value: string | undefined): string {
  return (value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/\s+([,.;:)])/g, "$1").replace(/\(\s+/g, "(").trim().slice(0, 160);
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

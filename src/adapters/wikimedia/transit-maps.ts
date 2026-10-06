import * as FileSystem from "expo-file-system/legacy";
import type { UUID } from "../../modules/_shared/model";
import {
  parseCommonsImageInfo,
  parseTransitMapsResults,
  transitMapsQuery,
  type SavedTransitMap,
  type TransitMapsModule,
} from "../../modules/transit-maps";

// Wikimedia asks API clients to identify themselves.
const HEADERS = { Accept: "application/json", "Api-User-Agent": "Naveyo/1.0 (iOS travel app)" };
const MAX_WIDTH = 3840;

const directory = (tripId: UUID) => `${FileSystem.documentDirectory ?? ""}transit-maps/${tripId}/`;
const indexPath = (tripId: UUID) => `${directory(tripId)}index.json`;

async function readIndex(tripId: UUID): Promise<SavedTransitMap[]> {
  if (!FileSystem.documentDirectory) return [];
  try {
    const parsed: unknown = JSON.parse(await FileSystem.readAsStringAsync(indexPath(tripId)));
    return Array.isArray(parsed) ? (parsed as SavedTransitMap[]) : [];
  } catch {
    return [];
  }
}

async function writeIndex(tripId: UUID, maps: SavedTransitMap[]): Promise<void> {
  await FileSystem.writeAsStringAsync(indexPath(tripId), JSON.stringify(maps));
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`Wikimedia a répondu ${response.status}.`);
  return response.json();
}

/**
 * Network maps come from Wikidata (which network serves the city, and its map)
 * and Wikimedia Commons (the freely licensed image, rendered as PNG).
 */
export const createWikimediaTransitMapsModule = (): TransitMapsModule => ({
  async find(coordinates) {
    const query = encodeURIComponent(transitMapsQuery(coordinates));
    return parseTransitMapsResults(await getJson(`https://query.wikidata.org/sparql?format=json&query=${query}`));
  },

  async download({ tripId, stopId, candidate }) {
    if (!FileSystem.documentDirectory) throw new Error("Stockage local indisponible.");
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      prop: "imageinfo",
      titles: `File:${candidate.fileName}`,
      iiprop: "url|size|extmetadata",
      iiurlwidth: String(MAX_WIDTH),
      iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist",
    });
    const image = parseCommonsImageInfo(await getJson(`https://commons.wikimedia.org/w/api.php?${params.toString()}`));
    if (!image) throw new Error("Ce plan n’est plus disponible sur Wikimedia Commons.");

    await FileSystem.makeDirectoryAsync(directory(tripId), { intermediates: true });
    const extension = /\.jpe?g(\?|$)/i.test(image.url) ? "jpg" : "png";
    const localUri = `${directory(tripId)}${candidate.networkId}.${extension}`;
    const partial = `${localUri}.part`;
    // Written aside first: an interrupted download never replaces a good map.
    const result = await FileSystem.downloadAsync(image.url, partial, { headers: HEADERS });
    if (result.status !== 200) {
      await FileSystem.deleteAsync(partial, { idempotent: true });
      throw new Error(`Téléchargement interrompu (${result.status}).`);
    }
    await FileSystem.deleteAsync(localUri, { idempotent: true });
    await FileSystem.moveAsync({ from: partial, to: localUri });
    const info = await FileSystem.getInfoAsync(localUri);

    const saved: SavedTransitMap = {
      networkId: candidate.networkId,
      tripId,
      stopId,
      name: candidate.name,
      kind: candidate.kind,
      localUri,
      width: image.width,
      height: image.height,
      attribution: { author: image.author, license: image.license, ...(image.licenseUrl ? { licenseUrl: image.licenseUrl } : {}), sourceUrl: image.sourceUrl },
      savedAt: new Date().toISOString(),
      sizeBytes: info.exists && "size" in info ? info.size : 0,
    };
    const others = (await readIndex(tripId)).filter((map) => map.networkId !== candidate.networkId);
    await writeIndex(tripId, [...others, saved]);
    return saved;
  },

  async list(tripId) {
    const maps = await readIndex(tripId);
    // A map whose file has vanished (storage cleaned) is not offered as offline.
    const checks = await Promise.all(maps.map(async (map) => (await FileSystem.getInfoAsync(map.localUri)).exists));
    return maps.filter((_, index) => checks[index]);
  },

  async remove(tripId, networkId) {
    const maps = await readIndex(tripId);
    const map = maps.find((item) => item.networkId === networkId);
    if (map) await FileSystem.deleteAsync(map.localUri, { idempotent: true });
    await writeIndex(tripId, maps.filter((item) => item.networkId !== networkId));
  },
});

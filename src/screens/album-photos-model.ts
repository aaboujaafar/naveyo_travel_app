import { localDate } from "./trip-stories-model";

/** The Étape fields the selection needs: dates are local YYYY-MM-DD. */
type AlbumStop = { id: string; name: string; startDate: string; endDate: string; timeZone: string; coordinates?: { latitude: number; longitude: number } };

/** What the photo library tells about a picture, without reading the image. */
export interface AlbumPhotoInput {
  id: string;
  uri: string;
  /** Epoch milliseconds. */
  takenAt: number;
  width: number;
  height: number;
  mediaSubtypes?: readonly string[];
  isFavorite?: boolean;
  location?: { latitude: number; longitude: number };
  /** iOS burst the photo belongs to, and whether iOS (or the traveller) picked it. */
  burstId?: string;
  burstPick?: boolean;
  /** On-device Vision analysis, when it could run. */
  analysis?: PhotoAnalysis;
}

export interface PhotoAnalysis {
  /** Vision aesthetics score, from -1 (failed shot) to 1. */
  score?: number;
  /** Receipts, documents, signs, screenshots of text: pictures taken to remember, not to show. */
  utility?: boolean;
  /** Same number for consecutive near-identical pictures. */
  similarGroup?: number;
}

export type SetAsideReason = "screenshot" | "too-small" | "far-away" | "utility" | "low-quality" | "duplicate" | "day-full" | "removed";

export const SET_ASIDE_LABELS: Record<SetAsideReason, string> = {
  screenshot: "Capture d’écran",
  "too-small": "Trop petite pour l’impression",
  "far-away": "Prise loin des Étapes",
  utility: "Photo pratique (ticket, document…)",
  "low-quality": "Floue ou ratée",
  duplicate: "Doublon probable",
  "day-full": "Journée déjà complète",
  removed: "Retirée par vous",
};

export interface AlbumDay {
  date: string;
  /** 1 for the first day of the Voyage. */
  dayNumber: number;
  stopId: string;
  stopName: string;
  selected: AlbumPhotoInput[];
  setAside: { photo: AlbumPhotoInput; reason: SetAsideReason }[];
}

export interface AlbumSelection {
  days: AlbumDay[];
  /** Photos read from the library but taken outside the Voyage. */
  outsideTrip: number;
}

export interface AlbumOverrides {
  /** Photos the traveller put back in; they always stay. */
  added: readonly string[];
  /** Photos the traveller took out. */
  removed: readonly string[];
}

export const DEFAULT_PHOTOS_PER_DAY = 6;
/** Below 2 megapixels a photo prints blurry on a full page. */
const MIN_PIXELS = 2_000_000;
/** Two shots this close are most likely the same scene. */
const DUPLICATE_WINDOW_MS = 10_000;
/** A photo farther than this from its day's Étapes was not taken on the Voyage. */
const MAX_DISTANCE_KM = 30;
/** Below this Vision aesthetics score a shot is blurred, dark or accidental (calibrated: sharp shots 0.2–0.8, a clearly blurred one −0.1). */
const MIN_SCORE = 0;

/**
 * Picks the album photos: (1) taken during the Voyage, dated in the local time
 * of its Étape; (2) near that Étape when the position is known; (3) real
 * pictures, not screenshots nor thumbnails; (4) not utility, failed or
 * near-identical shots, per the on-device Vision analysis; (5) a few per day,
 * favourites first, spread from morning to evening.
 */
export function selectAlbumPhotos(
  photos: readonly AlbumPhotoInput[],
  stops: readonly AlbumStop[],
  options: { perDay?: number; overrides?: AlbumOverrides } = {},
): AlbumSelection {
  const perDay = options.perDay ?? DEFAULT_PHOTOS_PER_DAY;
  const added = new Set(options.overrides?.added ?? []);
  const removed = new Set(options.overrides?.removed ?? []);
  const ordered = [...stops].sort((left, right) => left.startDate.localeCompare(right.startDate));
  const firstDay = ordered[0]?.startDate;

  // Filter 1 — the day of the Voyage, in the time zone of the Étape it belongs to.
  const byDay = new Map<string, { stop: AlbumStop; neighbours: AlbumStop[]; photos: AlbumPhotoInput[] }>();
  let outsideTrip = 0;
  for (const photo of photos) {
    const match = ordered
      .map((stop) => ({ stop, date: localDate(photo.takenAt, stop.timeZone) }))
      .find(({ stop, date }) => date >= stop.startDate && date <= stop.endDate);
    if (!match) {
      outsideTrip += 1;
      continue;
    }
    const entry = byDay.get(match.date) ?? { stop: match.stop, neighbours: neighboursOf(ordered, match.stop, match.date), photos: [] };
    entry.photos.push(photo);
    byDay.set(match.date, entry);
  }

  const days = [...byDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, { stop, neighbours, photos: dayPhotos }]): AlbumDay => {
      const sorted = [...dayPhotos].sort((left, right) => left.takenAt - right.takenAt);
      const setAside: AlbumDay["setAside"] = [];
      // Filters 2, 3 and 4 — where, what kind, and how good.
      const places = [stop, ...neighbours].flatMap((item) => (item.coordinates ? [item.coordinates] : []));
      const usable = sorted.filter((photo) => {
        if (added.has(photo.id)) return true;
        const reason: SetAsideReason | null = removed.has(photo.id)
          ? "removed"
          : photo.mediaSubtypes?.includes("screenshot")
            ? "screenshot"
            : photo.location && places.length > 0 && places.every((place) => distanceKm(place, photo.location!) > MAX_DISTANCE_KM)
              ? "far-away"
              : photo.width * photo.height < MIN_PIXELS
                ? "too-small"
                : photo.analysis?.utility && !photo.isFavorite
                  ? "utility"
                  : photo.analysis?.score !== undefined && photo.analysis.score < MIN_SCORE && !photo.isFavorite
                    ? "low-quality"
                    : null;
        if (reason) setAside.push({ photo, reason });
        return reason === null;
      });
      // Filter 5 — one picture per burst, then a balanced day.
      const { kept, duplicates } = collapseBursts(usable, added);
      for (const photo of duplicates) setAside.push({ photo, reason: "duplicate" });
      const selected = pickSpread(kept, perDay, added);
      const chosen = new Set(selected.map((photo) => photo.id));
      for (const photo of kept) if (!chosen.has(photo.id)) setAside.push({ photo, reason: "day-full" });
      setAside.sort((left, right) => left.photo.takenAt - right.photo.takenAt);
      return {
        date,
        dayNumber: firstDay ? daysBetween(firstDay, date) + 1 : 1,
        stopId: stop.id,
        stopName: stop.name,
        selected,
        setAside,
      };
    });

  return { days, outsideTrip };
}

/**
 * Shots taken a few seconds apart, or that Vision finds near-identical, form a
 * burst: the added or favourite one stands for it, else the best scored, else
 * the middle one; the others are duplicates.
 */
function collapseBursts(sorted: readonly AlbumPhotoInput[], added: ReadonlySet<string>): { kept: AlbumPhotoInput[]; duplicates: AlbumPhotoInput[] } {
  const groups: AlbumPhotoInput[][] = [];
  for (const photo of sorted) {
    const current = groups[groups.length - 1];
    const previous = current?.[current.length - 1];
    const sameScene = previous !== undefined && (
      photo.takenAt - previous.takenAt <= DUPLICATE_WINDOW_MS
      || (photo.burstId !== undefined && photo.burstId === previous.burstId)
      || (photo.analysis?.similarGroup !== undefined && photo.analysis.similarGroup === previous.analysis?.similarGroup)
    );
    if (current && sameScene) current.push(photo);
    else groups.push([photo]);
  }
  const kept: AlbumPhotoInput[] = [];
  const duplicates: AlbumPhotoInput[] = [];
  for (const group of groups) {
    const forced = group.filter((photo) => added.has(photo.id));
    const scored = group.filter((photo) => photo.analysis?.score !== undefined);
    const best = scored.length > 0 ? scored.reduce((top, photo) => (photo.analysis!.score! > top.analysis!.score! ? photo : top)) : undefined;
    const leaders = forced.length > 0 ? forced : [group.find((photo) => photo.isFavorite) ?? group.find((photo) => photo.burstPick) ?? best ?? group[Math.floor((group.length - 1) / 2)]!];
    kept.push(...leaders);
    duplicates.push(...group.filter((photo) => !leaders.includes(photo)));
  }
  return { kept, duplicates };
}

/**
 * Up to `target` photos (more when the traveller added some): favourites and
 * added ones first, then the photo closest to each evenly spaced moment of the
 * day, never within the duplicate window of one already kept.
 */
function pickSpread(sorted: readonly AlbumPhotoInput[], target: number, added: ReadonlySet<string>): AlbumPhotoInput[] {
  const forced = sorted.filter((photo) => added.has(photo.id));
  const favourites = sorted.filter((photo) => photo.isFavorite && !added.has(photo.id));
  const chosen: AlbumPhotoInput[] = [...forced];
  const farEnough = (photo: AlbumPhotoInput) => chosen.every((kept) => Math.abs(kept.takenAt - photo.takenAt) > DUPLICATE_WINDOW_MS);
  for (const photo of favourites) {
    if (chosen.length >= Math.max(target, forced.length)) break;
    if (farEnough(photo)) chosen.push(photo);
  }
  if (sorted.length > 0 && chosen.length < target) {
    const first = sorted[0]!.takenAt;
    const span = sorted[sorted.length - 1]!.takenAt - first;
    // Never more moments than photos: a huge target must not loop for ever.
    const slots = Math.min(target - chosen.length, sorted.length);
    for (let slot = 0; slot < slots; slot += 1) {
      // From the first to the last shot of the day, so mornings and evenings are told too.
      const moment = slots === 1 ? first + span / 2 : first + (span * slot) / (slots - 1);
      const best = sorted
        .filter((photo) => !chosen.includes(photo) && farEnough(photo))
        .sort((left, right) => Math.abs(left.takenAt - moment) - Math.abs(right.takenAt - moment))[0];
      if (best) chosen.push(best);
    }
  }
  return chosen.sort((left, right) => left.takenAt - right.takenAt);
}

/** Photos dated in the Voyage (filter 1 only), in shooting order: those worth reading further. */
export function photosDuringTrip<T extends Pick<AlbumPhotoInput, "takenAt">>(photos: readonly T[], stops: readonly AlbumStop[]): T[] {
  return photos
    .filter((photo) => stops.some((stop) => {
      const date = localDate(photo.takenAt, stop.timeZone);
      return date >= stop.startDate && date <= stop.endDate;
    }))
    .sort((left, right) => left.takenAt - right.takenAt);
}

/** On the first and last day of an Étape, the Voyage may already be at the previous or next one. */
function neighboursOf(ordered: readonly AlbumStop[], stop: AlbumStop, date: string): AlbumStop[] {
  const index = ordered.indexOf(stop);
  return [
    ...(date === stop.startDate && index > 0 ? [ordered[index - 1]!] : []),
    ...(date === stop.endDate && index < ordered.length - 1 ? [ordered[index + 1]!] : []),
  ];
}

function distanceKm(left: { latitude: number; longitude: number }, right: { latitude: number; longitude: number }): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(right.latitude - left.latitude);
  const dLon = toRad(right.longitude - left.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(left.latitude)) * Math.cos(toRad(right.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

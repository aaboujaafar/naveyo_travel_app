import type {
  Coordinates,
  ItineraryItem,
  PlaceCandidate,
  Stop,
  UUID,
} from "../modules/_shared/model";
import type { PlacesModule } from "../modules/places";

export type StopDiscoveryKind = "mustSee" | "activity" | "specialty";

export interface StopDiscoverySection {
  kind: StopDiscoveryKind;
  title: string;
  description: string;
  places: PlaceCandidate[];
}

const discoveryRequests: readonly {
  kind: StopDiscoveryKind;
  title: string;
  description: string;
  type: "attraction" | "activity" | "restaurant";
}[] = [
  {
    kind: "mustSee",
    title: "À voir absolument",
    description: "Les lieux emblématiques à ne pas manquer pendant cette étape.",
    type: "attraction",
  },
  {
    kind: "activity",
    title: "Activités autour",
    description: "Des idées de sorties et d'expériences à proximité.",
    type: "activity",
  },
  {
    kind: "specialty",
    title: "Spécialités locales",
    description: "Des adresses où découvrir la cuisine et les produits locaux.",
    type: "restaurant",
  },
];

export async function loadStopDiscovery(
  places: PlacesModule,
  tripId: UUID,
  stop: Stop,
  coordinates?: Coordinates,
): Promise<StopDiscoverySection[]> {
  const settled = await Promise.allSettled(
    discoveryRequests.map((request) =>
      coordinates
        ? places.nearby({
          coordinates,
          tripId,
          type: request.type,
          radiusMeters: 5_000,
          limit: 20,
        })
        : places.search({
          query: `${request.title} ${stop.name}`,
          tripId,
          stopId: stop.id,
          stopName: stop.name,
          countryCode: stop.countryCode,
          type: request.type,
        }),
    ),
  );
  if (settled.every((result) => result.status === "rejected")) {
    const failure = settled[0];
    throw failure?.status === "rejected" && failure.reason instanceof Error
      ? failure.reason
      : new Error("Places discovery is unavailable");
  }

  const seen = new Set<UUID>();
  return discoveryRequests.map((request, index) => {
    const result = settled[index];
    const candidates = result?.status === "fulfilled" ? result.value : [];
    const unique = candidates.filter((candidate) => {
      if (seen.has(candidate.id)) return false;
      seen.add(candidate.id);
      return true;
    }).slice(0, 4);
    return {
      kind: request.kind,
      title: request.title,
      description: request.description,
      places: unique,
    };
  });
}

export function recommendDiscoveryDate(stop: Stop, items: ItineraryItem[]): string {
  const counts = new Map<string, number>();
  for (const date of datesBetween(stop.startDate, stop.endDate)) counts.set(date, 0);
  for (const item of items) {
    if (item.stopId === stop.id && counts.has(item.date)) {
      counts.set(item.date, (counts.get(item.date) ?? 0) + 1);
    }
  }
  return [...counts].sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]))[0]?.[0]
    ?? stop.startDate;
}

export function discoveryNote(kind: StopDiscoveryKind): string {
  if (kind === "mustSee") return "Incontournable suggéré par Places";
  if (kind === "specialty") return "Spécialité locale suggérée par Places";
  return "Activité à proximité suggérée par Places";
}

function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

import type {
  ItineraryItem,
  PlaceCandidate,
  Stop,
  UUID,
} from "../_shared/model";

export interface ConfirmedPlaceInput {
  tripId: UUID;
  stopId: UUID;
  date: string;
  title: string;
  place: PlaceCandidate;
  time?: ItineraryItem["time"];
  notes?: string;
}

export interface ItineraryDay {
  date: string;
  stop: Stop;
  items: ItineraryItem[];
}

export interface ItineraryModule {
  list(tripId: UUID): Promise<ItineraryItem[]>;
  add(input: Omit<ItineraryItem, "id">): Promise<ItineraryItem>;
  addConfirmedPlace(input: ConfirmedPlaceInput): Promise<ItineraryItem>;
  /** Moves an activity to another day (and the Étape of that day); its clock time is kept. */
  move?(input: MoveItineraryItemInput): Promise<void>;
  remove?(tripId: UUID, itemId: UUID): Promise<void>;
}

export interface MoveItineraryItemInput {
  tripId: UUID;
  itemId: UUID;
  stopId: UUID;
  date: string;
}

export function sortItineraryItems(
  items: ItineraryItem[],
  stops: Stop[],
): ItineraryItem[] {
  const stopOrder = new Map(stops.map((stop) => [stop.id, stop.startDate]));
  return [...items].sort((left, right) => {
    const leftStopDate = stopOrder.get(left.stopId) ?? left.date;
    const rightStopDate = stopOrder.get(right.stopId) ?? right.date;
    return `${leftStopDate}|${left.date}|${left.time?.local ?? "99:99"}`.localeCompare(
      `${rightStopDate}|${right.date}|${right.time?.local ?? "99:99"}`,
    );
  });
}

export function buildItineraryDays(
  items: ItineraryItem[],
  stops: Stop[],
): ItineraryDay[] {
  const sorted = sortItineraryItems(items, stops);
  return stops.flatMap((stop) => {
    const dates = datesBetween(stop.startDate, stop.endDate);
    return dates.map((date) => ({
      date,
      stop,
      items: sorted.filter(
        (item) => item.stopId === stop.id && item.date === date,
      ),
    }));
  });
}

function datesBetween(start: string, end: string): string[] {
  const result: string[] = [];
  const current = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (current <= last) {
    result.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return result;
}

import type { ItineraryItem, PlaceCandidate, UUID } from "../_shared/model";
import type { ConfirmedPlaceInput, ItineraryModule, MoveItineraryItemInput } from "./interface";

export class InMemoryItineraryModule implements ItineraryModule {
  private readonly items: ItineraryItem[];
  private sequence = 0;

  constructor(
    initialItems: ItineraryItem[] = [],
    private online = true,
  ) {
    this.items = [...initialItems];
  }

  setOnline(online: boolean): void {
    this.online = online;
  }

  async list(tripId: UUID): Promise<ItineraryItem[]> {
    return this.items.filter((item) => item.tripId === tripId);
  }

  async add(input: Omit<ItineraryItem, "id">): Promise<ItineraryItem> {
    if (!this.online) throw new Error("ITINERARY_MUTATIONS_DISABLED_OFFLINE");
    const item: ItineraryItem = { ...input, id: this.nextId() };
    this.items.push(item);
    return item;
  }

  async addConfirmedPlace(input: ConfirmedPlaceInput): Promise<ItineraryItem> {
    const { place, ...rest } = input;
    return this.add({
      ...rest,
      place: placeReference(place),
    });
  }

  async move(input: MoveItineraryItemInput): Promise<void> {
    if (!this.online) throw new Error("ITINERARY_MUTATIONS_DISABLED_OFFLINE");
    const index = this.items.findIndex((item) => item.tripId === input.tripId && item.id === input.itemId);
    if (index < 0) throw new Error("Itinerary item not found");
    const item = this.items[index]!;
    const time = item.time ? { ...item.time, local: `${input.date}T${item.time.local.slice(-5)}` } : undefined;
    this.items[index] = { ...item, stopId: input.stopId, date: input.date, ...(time ? { time } : {}) };
  }

  async remove(tripId: UUID, itemId: UUID): Promise<void> {
    if (!this.online) throw new Error("ITINERARY_MUTATIONS_DISABLED_OFFLINE");
    const index = this.items.findIndex((item) => item.tripId === tripId && item.id === itemId);
    if (index >= 0) this.items.splice(index, 1);
  }

  private nextId(): UUID {
    this.sequence += 1;
    return `00000000-0000-4000-8000-${String(this.sequence).padStart(12, "0")}` as UUID;
  }
}

function placeReference(place: PlaceCandidate): ItineraryItem["place"] {
  return {
    kind: "venue",
    placeId: place.id,
    label: place.name,
    address: place.address,
    countryCode: place.countryCode,
    coordinates: place.coordinates,
    attribution: place.attribution,
  };
}

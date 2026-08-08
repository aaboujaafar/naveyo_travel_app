import { createUuid } from "../_shared/uuid";
import type { Reservation, ReservationDraft, UUID } from "../_shared/model";
import type { ReservationConfirmation, ReservationsModule } from "./interface";
import { reservationFingerprint, validateDraftForConfirmation } from "./module";

export interface ReservationStorage {
  read(): Promise<Reservation[]>;
  write(reservations: Reservation[]): Promise<void>;
}

export class PersistentReservationsModule implements ReservationsModule {
  private reservations: Reservation[] = [];
  private loaded: Promise<void> | null = null;

  constructor(private readonly storage: ReservationStorage) {}

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      this.loaded = this.storage.read().then((reservations) => { this.reservations = reservations; });
    }
    await this.loaded;
  }

  async list(tripId: UUID): Promise<Reservation[]> {
    await this.ensureLoaded();
    return this.reservations.filter((item) => item.tripId === tripId);
  }

  async findDuplicate(tripId: UUID, draft: ReservationDraft): Promise<Reservation | null> {
    await this.ensureLoaded();
    const fingerprint = reservationFingerprint(draft);
    return this.reservations.find((item) => item.tripId === tripId && reservationFingerprint({
      type: item.type,
      title: item.title,
      provider: item.provider,
      reference: item.reference,
      start: item.start,
      confidence: "high",
      fieldsRequiringConfirmation: [],
    }) === fingerprint) ?? null;
  }

  async confirm(input: ReservationConfirmation): Promise<Reservation> {
    await this.ensureLoaded();
    validateDraftForConfirmation(input.draft);
    const required = new Set(input.draft.fieldsRequiringConfirmation);
    const confirmed = new Set(input.confirmedFields);
    const missing = [...required].filter((field) => !confirmed.has(field));
    if (missing.length > 0) throw new Error(`Confirm these fields before saving: ${missing.join(", ")}`);
    if (await this.findDuplicate(input.tripId, input.draft)) throw new Error("This reservation is already imported");
    const reservation: Reservation = {
      id: createUuid(),
      tripId: input.tripId,
      type: input.draft.type!,
      title: input.draft.title!.trim(),
      provider: input.draft.provider?.trim() || undefined,
      reference: input.draft.reference?.trim() || undefined,
      start: input.draft.start,
      end: input.draft.end,
      venue: input.draft.venue,
      origin: input.draft.origin,
      destination: input.draft.destination,
      confirmedAt: new Date().toISOString() as Reservation["confirmedAt"],
    };
    this.reservations.push(reservation);
    await this.storage.write(this.reservations);
    return reservation;
  }
}

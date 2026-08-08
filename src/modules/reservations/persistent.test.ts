import { describe, expect, it } from "vitest";
import type { Reservation } from "../_shared/model";
import { PersistentReservationsModule, type ReservationStorage } from "./persistent";

const tripId = "10000000-0000-4000-8000-000000000001" as Reservation["tripId"];

function storage(): ReservationStorage {
  let value: Reservation[] = [];
  return {
    read: async () => value,
    write: async (next) => { value = next; },
  };
}

describe("PersistentReservationsModule", () => {
  it("restores confirmed reservations after a module restart", async () => {
    const persisted = storage();
    const first = new PersistentReservationsModule(persisted);
    await first.confirm({
      tripId,
      draft: {
        type: "flight",
        title: "Vol Paris Athènes",
        confidence: "high",
        fieldsRequiringConfirmation: ["type", "title"],
      },
      confirmedFields: ["type", "title"],
    });

    const restarted = new PersistentReservationsModule(persisted);
    const reservations = await restarted.list(tripId);
    expect(reservations).toHaveLength(1);
    expect(reservations[0]?.title).toBe("Vol Paris Athènes");
  });
});

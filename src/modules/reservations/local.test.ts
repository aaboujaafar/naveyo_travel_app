import { describe, expect, it } from "vitest";
import { uuid } from "../_shared/fake";
import { sharedLocalReservations } from "./local";

describe("local reservation runtime", () => {
  it("keeps a confirmed reservation visible to the listing screen", async () => {
    const tripId = uuid("00000000-0000-4000-8000-000000000099");

    await sharedLocalReservations.confirm({
      tripId,
      draft: {
        confidence: "high",
        fieldsRequiringConfirmation: [],
        type: "flight",
        title: "Vol de test partagé",
      },
      confirmedFields: [],
    });

    expect(await sharedLocalReservations.list(tripId)).toHaveLength(1);
  });
});

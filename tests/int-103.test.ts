import { describe, expect, it } from "vitest";
import type { TrackingStatus } from "../src/modules/_shared/model";
import {
  trackingButtonLabel,
  trackingErrorStatus,
  trackingStatusMessage,
  trackingStatusTitle,
} from "../src/modules/trip-tracking/tracking-screen-state";

describe("INT-103 tracking screen", () => {
  it.each([
    ["stopped", "Enregistrement arrêté", "Démarrer la trace"],
    ["starting", "Démarrage…", "Démarrer la trace"],
    ["recording", "Enregistrement actif", "Arrêter la trace"],
    ["error", "Trace indisponible", "Démarrer la trace"],
  ] as const)("renders the %s state", (state, title, button) => {
    const status: TrackingStatus = { state };
    expect(trackingStatusTitle(status)).toBe(title);
    expect(trackingButtonLabel(status)).toBe(button);
  });

  it("explains that recording is local and visible", () => {
    expect(
      trackingStatusMessage({ state: "recording" }),
    ).toContain("enregistrés localement");
  });

  it("keeps tracker failures visible to the user", () => {
    const status = trackingErrorStatus("trip-1", new Error("Permission denied"));
    expect(status).toEqual({
      state: "error",
      tripId: "trip-1",
      message: "Permission denied",
    });
    expect(trackingStatusMessage(status)).toBe("Permission denied");
  });

  it("uses a safe message for unknown failures", () => {
    expect(trackingErrorStatus(undefined, "offline")).toEqual({
      state: "error",
      message: "Erreur de suivi inconnue",
    });
  });
});

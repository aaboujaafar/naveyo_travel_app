import { describe, expect, it } from "vitest";
import { adaptiveLocationTaskOptions } from "./options";

describe("adaptive Expo location options", () => {
  it("uses one stable background configuration with iOS battery controls", () => {
    expect(adaptiveLocationTaskOptions).toMatchObject({
      accuracy: 4,
      distanceInterval: 20,
      deferredUpdatesDistance: 75,
      deferredUpdatesInterval: 60_000,
      activityType: 4,
      pausesUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: true,
    });
  });
});

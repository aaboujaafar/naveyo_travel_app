import { describe, expect, it } from "vitest";
import {
  createAdaptiveTrackingState,
  evaluateLocationObservation,
  parseAdaptiveTrackingState,
  type AdaptiveTrackingState,
  type LocationObservation,
} from "./adaptive";

const metersInLongitude = (meters: number): number => meters / 111_320;

const observation = (
  meters: number,
  seconds: number,
  speedMetersPerSecond?: number,
  accuracyMeters = 5,
): LocationObservation => ({
  latitude: 0,
  longitude: metersInLongitude(meters),
  recordedAtMs: seconds * 1000,
  accuracyMeters,
  speedMetersPerSecond,
});

const feed = (
  initial: AdaptiveTrackingState,
  observations: LocationObservation[],
) => observations.map((item) => {
  const decision = evaluateLocationObservation(initial, item);
  initial = decision.state;
  return decision;
});

describe("adaptive trip tracking", () => {
  it("keeps only a sparse heartbeat while stationary", () => {
    const decisions = feed(createAdaptiveTrackingState(), [
      observation(0, 1, 0),
      observation(1, 301, 0),
      observation(2, 601, 0),
      observation(3, 902, 0),
    ]);

    expect(decisions.map(({ accept }) => accept)).toEqual([true, false, false, true]);
    expect(decisions.at(-1)?.mode).toBe("STATIONARY");
  });

  it("requires three sustained measurements before switching to walking", () => {
    const decisions = feed(createAdaptiveTrackingState(), [
      observation(0, 1, 0),
      observation(12, 11, 1.2),
      observation(24, 21, 1.2),
      observation(36, 31, 1.2),
    ]);

    expect(decisions.map(({ mode }) => mode)).toEqual([
      "STATIONARY",
      "STATIONARY",
      "STATIONARY",
      "WALKING",
    ]);
    expect(decisions.at(-1)?.accept).toBe(true);
  });

  it("stores walking points at roughly twenty-five metre intervals", () => {
    const walking: AdaptiveTrackingState = {
      mode: "WALKING",
      candidateCount: 0,
      lastObservation: observation(0, 1, 1.4),
      lastAccepted: observation(0, 1, 1.4),
    };
    const decisions = feed(walking, [
      observation(15, 12, 1.4),
      observation(26, 20, 1.4),
      observation(45, 34, 1.4),
      observation(52, 39, 1.4),
    ]);

    expect(decisions.map(({ accept }) => accept)).toEqual([false, true, false, true]);
  });

  it("switches to fast movement and stores points around seventy-five metres apart", () => {
    const walking: AdaptiveTrackingState = {
      mode: "WALKING",
      candidateCount: 0,
      lastObservation: observation(0, 1, 1.4),
      lastAccepted: observation(0, 1, 1.4),
    };
    const decisions = feed(walking, [
      observation(50, 8, 8),
      observation(110, 16, 8),
      observation(180, 24, 8),
      observation(230, 31, 8),
      observation(260, 35, 8),
    ]);

    expect(decisions[2]?.mode).toBe("FAST_MOVING");
    expect(decisions[3]?.accept).toBe(false);
    expect(decisions[4]?.accept).toBe(true);
  });

  it("uses distance and elapsed time when the provider speed is absent", () => {
    const decisions = feed(createAdaptiveTrackingState(), [
      observation(0, 1),
      observation(20, 11),
      observation(40, 21),
      observation(60, 31),
    ]);

    expect(decisions.at(-1)?.mode).toBe("WALKING");
    expect(decisions.at(-1)?.effectiveSpeedMetersPerSecond).toBeGreaterThan(1.9);
  });

  it("requires four stationary confirmations over two minutes", () => {
    const walking: AdaptiveTrackingState = {
      mode: "WALKING",
      candidateCount: 0,
      lastObservation: observation(0, 1, 1.2),
      lastAccepted: observation(0, 1, 1.2),
    };
    const decisions = feed(walking, [
      observation(1, 10, 0),
      observation(2, 50, 0),
      observation(1, 90, 0),
      observation(2, 130, 0),
    ]);

    expect(decisions.slice(0, 3).every(({ mode }) => mode === "WALKING")).toBe(true);
    expect(decisions.at(-1)?.mode).toBe("STATIONARY");
  });

  it("ignores inaccurate and out-of-order observations without changing state", () => {
    const initial = createAdaptiveTrackingState();
    const first = evaluateLocationObservation(initial, observation(0, 10, 0));
    const inaccurate = evaluateLocationObservation(first.state, observation(500, 20, 20, 120));
    const old = evaluateLocationObservation(inaccurate.state, observation(20, 5, 2));

    expect(inaccurate.accept).toBe(false);
    expect(old.accept).toBe(false);
    expect(old.state).toEqual(first.state);
  });

  it("restores persisted state and falls back safely for malformed data", () => {
    const state = {
      mode: "FAST_MOVING",
      candidateCount: 2,
      candidateMode: "WALKING",
      candidateSinceMs: 1000,
      lastObservation: observation(100, 10, 8),
      lastAccepted: observation(75, 8, 8),
    } satisfies AdaptiveTrackingState;

    expect(parseAdaptiveTrackingState(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(parseAdaptiveTrackingState({ mode: "UNKNOWN" })).toEqual(createAdaptiveTrackingState());
  });
});

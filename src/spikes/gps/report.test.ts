import { describe, expect, it } from "vitest";

import {
  applyTrackingInfoPlistDefaults,
  formatGpsSpikeReport,
  gpsSpikeReport,
  mergeLocationBackgroundModes,
  trackingPermissionPrompts,
} from "./report";

describe("gps spike report", () => {
  it("records a blocked decision with the local evidence we can verify", () => {
    expect(gpsSpikeReport.decision).toBe("BLOCKED");
    expect(gpsSpikeReport.repositoryEvidence).toHaveLength(3);
    expect(gpsSpikeReport.dependencyBlockers).toHaveLength(2);
    expect(gpsSpikeReport.deviceScenarios).toHaveLength(6);
    expect(formatGpsSpikeReport()).toContain("Decision: BLOCKED");
    expect(formatGpsSpikeReport()).toContain("Device-backed validation");
  });

  it("merges the iOS background location mode without dropping existing values", () => {
    expect(mergeLocationBackgroundModes(undefined)).toEqual(["location"]);
    expect(
      mergeLocationBackgroundModes(["fetch", "location", 42, "fetch"]),
    ).toEqual(["fetch", "location"]);
  });

  it("applies explicit location permission prompts to the Info.plist draft", () => {
    const infoPlist = applyTrackingInfoPlistDefaults({
      CFBundleDisplayName: "Naveyo",
      UIBackgroundModes: ["fetch"],
    });

    expect(infoPlist.NSLocationWhenInUseUsageDescription).toBe(
      trackingPermissionPrompts.whenInUse,
    );
    expect(infoPlist.NSLocationAlwaysAndWhenInUseUsageDescription).toBe(
      trackingPermissionPrompts.always,
    );
    expect(infoPlist.UIBackgroundModes).toEqual(["fetch", "location"]);
  });
});

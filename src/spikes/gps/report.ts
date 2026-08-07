export {
  applyTrackingInfoPlistDefaults,
  mergeLocationBackgroundModes,
  trackingPermissionPrompts,
} from "../../../plugins/withNaveyoTracking";

export type GpsSpikeDecision = "GO Transistorsoft" | "FALLBACK" | "BLOCKED";

export type GpsVerificationStatus = "verified" | "blocked" | "not-run";

export interface GpsSpikeEvidence {
  readonly label: string;
  readonly status: GpsVerificationStatus;
  readonly note: string;
}

export interface GpsSpikeScenario {
  readonly name: string;
  readonly status: GpsVerificationStatus;
  readonly note: string;
}

export interface GpsSpikeReport {
  readonly taskId: "SPI-001";
  readonly branch: "spi-001-gps-spike";
  readonly decision: GpsSpikeDecision;
  readonly generatedAt: string;
  readonly repositoryEvidence: readonly GpsSpikeEvidence[];
  readonly dependencyBlockers: readonly GpsSpikeEvidence[];
  readonly deviceScenarios: readonly GpsSpikeScenario[];
  readonly nextStep: string;
}

export const gpsSpikeReport: GpsSpikeReport = {
  taskId: "SPI-001",
  branch: "spi-001-gps-spike",
  decision: "BLOCKED",
  generatedAt: "2026-07-29",
  repositoryEvidence: [
    {
      label: "Working branch",
      status: "verified",
      note: "The spike is now on spi-001-gps-spike, which matches TASKS.md.",
    },
    {
      label: "Plugin wiring",
      status: "verified",
      note: "app.config.ts already references ./plugins/withNaveyoTracking.",
    },
    {
      label: "Local plugin helper",
      status: "verified",
      note: "The plugin now sets iOS location usage strings and background location mode.",
    },
  ],
  dependencyBlockers: [
    {
      label: "Device-backed validation",
      status: "blocked",
      note: "The open-source Expo Location adapter is implemented, but no real iPhone build has validated background delivery, battery use or the force-quit limitation.",
    },
    {
      label: "Force-quit limitation",
      status: "blocked",
      note: "Expo documents that iOS background location can stop when the user terminates the app; acceptability for the alpha must be decided after device testing.",
    },
  ],
  deviceScenarios: [
    {
      name: "Walk at least 1 km",
      status: "not-run",
      note: "Requires a real iPhone and a tracking SDK on device.",
    },
    {
      name: "Remain still for 30 minutes",
      status: "not-run",
      note: "Requires background location recording on a real device.",
    },
    {
      name: "Lock the screen",
      status: "not-run",
      note: "Cannot be exercised from this environment.",
    },
    {
      name: "Spend one hour in airplane mode and return online",
      status: "not-run",
      note: "Cannot be exercised from this environment.",
    },
    {
      name: "Force-quit and relaunch",
      status: "not-run",
      note: "Cannot be exercised from this environment.",
    },
    {
      name: "Repeat on the second iPhone model",
      status: "not-run",
      note: "No second device is available here.",
    },
  ],
  nextStep:
    "Install a development build with the open-source Expo Location adapter, then rerun the scenario matrix on both iPhones.",
};

export function formatGpsSpikeReport(
  report: GpsSpikeReport = gpsSpikeReport,
): string {
  const lines = [
    `SPI-001 GPS spike report`,
    `Branch: ${report.branch}`,
    `Decision: ${report.decision}`,
    `Generated at: ${report.generatedAt}`,
    "",
    "Repository evidence:",
  ];

  for (const evidence of report.repositoryEvidence) {
    lines.push(`- [${evidence.status}] ${evidence.label}: ${evidence.note}`);
  }

  lines.push("", "Blockers:");

  for (const blocker of report.dependencyBlockers) {
    lines.push(`- [${blocker.status}] ${blocker.label}: ${blocker.note}`);
  }

  lines.push("", "Scenario matrix:");

  for (const scenario of report.deviceScenarios) {
    lines.push(`- [${scenario.status}] ${scenario.name}: ${scenario.note}`);
  }

  lines.push("", `Next step: ${report.nextStep}`);

  return lines.join("\n");
}

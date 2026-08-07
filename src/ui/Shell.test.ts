import { describe, expect, it } from "vitest";
import {
  describeConnectivity,
  formatLastSyncLabel,
  resolveEntryRoute,
  resolveShellRedirect,
} from "./shell-helpers";

describe("shell helpers", () => {
  it("resolves the entry route from auth state", () => {
    expect(resolveEntryRoute(true)).toBe("/(app)");
    expect(resolveEntryRoute(false)).toBe("/(auth)/sign-in");
  });

  it("redirects only when the current route disagrees with auth state", () => {
    expect(resolveShellRedirect(false, "(auth)")).toBeNull();
    expect(resolveShellRedirect(true, "(auth)")).toBe("/(app)");
    expect(resolveShellRedirect(false, "(app)")).toBe("/(auth)/sign-in");
    expect(resolveShellRedirect(true, "(app)")).toBeNull();
    expect(resolveShellRedirect(false, "unknown")).toBeNull();
  });

  it("describes offline connectivity with a sync label", () => {
    const connectivity = describeConnectivity({
      isOffline: true,
      lastSyncedAt: "2026-07-29T08:30:00.000Z",
    });

    expect(connectivity.statusLabel).toBe("Hors ligne");
    expect(connectivity.helperLabel).toContain(
      "mutations ordinaires sont désactivées",
    );
    expect(connectivity.helperLabel).not.toContain("attendront");
    expect(connectivity.syncLabel).toContain("Dernière synchro");
  });

  it("formats a last sync label and handles invalid values", () => {
    expect(formatLastSyncLabel(null)).toBe("Dernière synchro non disponible");
    expect(formatLastSyncLabel("not-a-date")).toBe(
      "Dernière synchro non disponible",
    );

    const label = formatLastSyncLabel("2026-07-29T08:30:00.000Z");
    expect(label).toContain("Dernière synchro");
    expect(label).toContain("2026");
  });
});

export type EntryRoute = "/(auth)" | "/(auth)/sign-in" | "/(app)";
export type ShellRouteGroup = "(auth)" | "(app)" | "unknown";

export type ShellConnectivityState = {
  isOffline: boolean;
  lastSyncedAt?: string | null;
};

export function resolveEntryRoute(isAuthenticated: boolean): EntryRoute {
  return isAuthenticated ? "/(app)" : "/(auth)/sign-in";
}

export function resolveShellRedirect(
  isAuthenticated: boolean,
  currentRouteGroup: ShellRouteGroup,
): EntryRoute | null {
  if (currentRouteGroup === "unknown") {
    return isAuthenticated ? "/(app)" : "/(auth)";
  }
  if (isAuthenticated && currentRouteGroup === "(auth)") return "/(app)";
  if (!isAuthenticated && currentRouteGroup === "(app)")
    return "/(auth)/sign-in";
  return null;
}

export function formatLastSyncLabel(lastSyncedAt?: string | null): string {
  if (!lastSyncedAt) {
    return "Dernière synchro non disponible";
  }

  const parsed = new Date(lastSyncedAt);
  if (Number.isNaN(parsed.getTime())) {
    return "Dernière synchro non disponible";
  }

  const date = parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = parsed.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `Dernière synchro ${date} à ${time}`;
}

export function describeConnectivity({
  isOffline,
  lastSyncedAt,
}: ShellConnectivityState) {
  const statusLabel = isOffline ? "Hors ligne" : "En ligne";
  const helperLabel = isOffline
    ? "Les mutations ordinaires sont désactivées hors ligne."
    : "La synchronisation privée est prête.";

  return {
    statusLabel,
    helperLabel,
    syncLabel: formatLastSyncLabel(lastSyncedAt),
  };
}

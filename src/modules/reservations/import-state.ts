import type { PendingReservationImport } from "./interface";

export function recoverPendingImport(item: PendingReservationImport): PendingReservationImport {
  return item.status === "processing" ? { ...item, status: "seen" } : item;
}

export function describeAnalysisFailure(cause: unknown): {
  message: string;
  isOffline: boolean;
} {
  const raw = cause instanceof Error ? cause.message : "Analyse IA impossible";
  const normalized = raw.toLowerCase();
  const isOffline =
    normalized.includes("network") ||
    normalized.includes("fetch") ||
    normalized.includes("timed out") ||
    normalized.includes("timeout") ||
    normalized.includes("connexion") ||
    normalized.includes("hors ligne");

  if (isOffline) {
    return {
      isOffline: true,
      message: "Naveyo ne peut pas joindre le fournisseur IA pour l’instant. Vérifiez la connexion puis réessayez.",
    };
  }

  if (normalized.includes("invalid reservation draft")) {
    return {
      isOffline: false,
      message: "Le fournisseur IA a renvoyé un brouillon incomplet. Vous pouvez relancer l’analyse avec le même document.",
    };
  }

  return {
    isOffline: false,
    message: raw,
  };
}

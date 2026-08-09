import type { PendingShareImport } from "../../../src/adapters/apple-document-analysis";

export function recoverPendingImport(item: PendingShareImport): PendingShareImport {
  return item.status === "processing" ? { ...item, status: "seen" } : item;
}

export function describeAnalysisFailure(cause: unknown): {
  message: string;
  isOffline: boolean;
} {
  const raw = cause instanceof Error ? cause.message : "Analyse OpenCode impossible";
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
      message: "Naveyo ne peut pas joindre OpenCode pour l’instant. Vérifiez la connexion puis réessayez.",
    };
  }

  if (normalized.includes("invalid reservation draft")) {
    return {
      isOffline: false,
      message: "OpenCode a renvoyé un brouillon incomplet. Vous pouvez relancer l’analyse avec le même document.",
    };
  }

  return {
    isOffline: false,
    message: raw,
  };
}

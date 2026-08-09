import type { TrackingStatus } from "../../../../../src/modules/_shared/model";

export function trackingStatusTitle(status: TrackingStatus): string {
  switch (status.state) {
    case "recording":
      return "Enregistrement actif";
    case "starting":
      return "Démarrage…";
    case "error":
      return "Trace indisponible";
    case "stopped":
      return "Enregistrement arrêté";
  }
}

export function trackingStatusMessage(status: TrackingStatus): string {
  if (status.state === "recording")
    return "Les points sont enregistrés localement sur cet iPhone.";
  if (status.state === "error")
    return status.message ?? "Le suivi n’a pas pu démarrer.";
  if (status.state === "starting") return "Vérification des autorisations iOS…";
  return "Le suivi est arrêté. Le démarrage demande les autorisations de localisation iOS.";
}

export function trackingButtonLabel(status: TrackingStatus): string {
  return status.state === "recording"
    ? "Arrêter la trace"
    : "Démarrer la trace";
}

export function trackingErrorStatus(
  tripId: string | undefined,
  cause: unknown,
): TrackingStatus {
  return {
    state: "error",
    ...(tripId ? { tripId: tripId as TrackingStatus["tripId"] } : {}),
    message: cause instanceof Error ? cause.message : "Erreur de suivi inconnue",
  };
}

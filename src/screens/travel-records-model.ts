import type { Reservation, TravelDocument } from "../modules/_shared/model";

export function formatDocumentSize(bytes?: number): string {
  if (bytes === undefined) return "Taille inconnue";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

export function formatDocumentDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatReservationDate(reservation: Reservation): string {
  const local = reservation.start?.local;
  if (!local) return "Date à préciser";
  const date = local.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}

export function formatReservationTime(reservation: Reservation): string | null {
  const local = reservation.start?.local;
  if (!local) return null;
  const match = /(?:T|\s)(\d{2}:\d{2})/.exec(local);
  return match?.[1] ?? null;
}

export function labelReservationType(type: Reservation["type"]): string {
  return {
    accommodation: "Logement",
    flight: "Vol",
    train: "Train",
    ferry: "Ferry",
    activity: "Activité",
    other: "Autre",
  }[type];
}

export function labelDocumentKind(kind: TravelDocument["kind"]): string {
  return { pdf: "PDF", image: "Image", text: "Texte", url: "Lien", ics: "Calendrier" }[kind];
}

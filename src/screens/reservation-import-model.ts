import type { ReservationDraft } from "../modules/_shared/model";

export interface ReservationDraftField {
  key: string;
  label: string;
  value: string;
}

const fieldOrder = [
  "type",
  "title",
  "provider",
  "reference",
  "start",
  "end",
  "venue",
  "origin",
  "destination",
] as const;

const fieldLabels: Record<(typeof fieldOrder)[number], string> = {
  type: "Type de réservation",
  title: "Intitulé",
  provider: "Prestataire",
  reference: "Référence",
  start: "Début",
  end: "Fin",
  venue: "Lieu",
  origin: "Départ",
  destination: "Arrivée",
};

const typeLabels: Record<NonNullable<ReservationDraft["type"]>, string> = {
  accommodation: "Hébergement",
  flight: "Vol",
  train: "Train",
  ferry: "Ferry",
  activity: "Activité",
  other: "Autre",
};

function valueForField(
  draft: ReservationDraft,
  key: (typeof fieldOrder)[number],
): string | undefined {
  const value = draft[key];
  if (value === undefined) return undefined;
  if (key === "type") return typeLabels[value as NonNullable<ReservationDraft["type"]>];
  if (key === "start" || key === "end") {
    const dateTime = value as NonNullable<ReservationDraft["start"]>;
    return `${dateTime.local} · ${dateTime.timeZone}`;
  }
  if (key === "venue" || key === "origin" || key === "destination") {
    const place = value as NonNullable<ReservationDraft["venue"]>;
    return place.address ? `${place.label} · ${place.address}` : place.label;
  }
  return String(value);
}

export function buildReservationDraftFields(
  draft: ReservationDraft,
): ReservationDraftField[] {
  const required = new Set(draft.fieldsRequiringConfirmation);
  const fields: ReservationDraftField[] = fieldOrder.flatMap((key) => {
    const value = valueForField(draft, key);
    if (value === undefined && !required.has(key)) return [];
    return [{ key, label: fieldLabels[key], value: value ?? "À préciser" }];
  });

  for (const key of required) {
    if (!fields.some((field) => field.key === key)) {
      fields.push({ key, label: key, value: "Champ signalé par l’analyse" });
    }
  }
  return fields;
}

export function canConfirmReservationDraft(
  draft: ReservationDraft,
  fields: ReservationDraftField[],
  confirmedFields: ReadonlySet<string>,
): boolean {
  return Boolean(
    draft.type &&
      draft.title?.trim() &&
      fields.length > 0 &&
      fields.every((field) => confirmedFields.has(field.key)),
  );
}

export function confidenceLabel(confidence: ReservationDraft["confidence"]): string {
  if (confidence === "high") return "Confiance élevée";
  if (confidence === "medium") return "Confiance moyenne";
  return "Confiance faible";
}

import { parseReservationDraft } from "../_shared/validation";
import { createUuid } from "../_shared/uuid";
import type {
  Reservation,
  ReservationDraft,
  UUID,
} from "../_shared/model";
import type {
  DocumentAnalyzer,
  ReservationConfirmation,
  ReservationImportResult,
  ReservationImportSource,
  ReservationsModule,
} from "./interface";

const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
const supportedKinds = new Set(["pdf", "image", "text", "url", "ics"]);

export function validateImportSource(source: ReservationImportSource): void {
  if (!source.uri.trim()) throw new Error("Import source is required");
  if (!supportedKinds.has(source.kind))
    throw new Error("Unsupported reservation source");
  if (source.sizeBytes !== undefined) {
    if (!Number.isSafeInteger(source.sizeBytes) || source.sizeBytes < 0)
      throw new Error("Invalid import source size");
    if (source.sizeBytes > MAX_IMPORT_BYTES)
      throw new Error("Import source exceeds the 25 MB limit");
  }
}

export function validateDraftForConfirmation(draft: ReservationDraft): void {
  if (!draft.title?.trim()) throw new Error("Reservation title is required");
  if (!draft.type) throw new Error("Reservation type is required");
  if (draft.start && draft.end && draft.start.local > draft.end.local)
    throw new Error("Reservation dates are inconsistent");
}

export function reservationFingerprint(draft: ReservationDraft): string {
  return [
    draft.type ?? "other",
    draft.title?.trim().toLocaleLowerCase() ?? "",
    draft.provider?.trim().toLocaleLowerCase() ?? "",
    draft.reference?.trim().toLocaleLowerCase() ?? "",
    draft.start?.local ?? "",
  ].join("|");
}

export async function analyzeReservationImport(
  analyzer: DocumentAnalyzer,
  source: ReservationImportSource,
): Promise<ReservationImportResult> {
  try {
    validateImportSource(source);
    const draft = parseReservationDraft(await analyzer.analyze(source));
    return { state: "needs-confirmation", draft };
  } catch (cause: unknown) {
    return {
      state: "error",
      message:
        cause instanceof Error ? cause.message : "Unable to analyze import",
    };
  }
}

/**
 * A deterministic local fallback used until the native PDF/OCR adapter is wired.
 * It accepts one `key=value` pair per line and never marks data as confirmed.
 */
export class ManualReservationAnalyzer implements DocumentAnalyzer {
  async analyze(source: ReservationImportSource): Promise<ReservationDraft> {
    validateImportSource(source);
    if (source.kind !== "text")
      throw new Error("This build accepts pasted text as the import fallback");
    const text = source.uri.startsWith("text:")
      ? decodeURIComponent(source.uri.slice("text:".length))
      : source.uri;
    const values = new Map<string, string>();
    for (const line of text.split(/\r?\n/)) {
      const separator = line.indexOf("=");
      if (separator <= 0) continue;
      const key = line.slice(0, separator).trim().toLowerCase();
      const value = line.slice(separator + 1).trim();
      if (key && value) values.set(key, value);
    }
    const type = values.get("type");
    const title = values.get("title");
    const draft: ReservationDraft = {
      confidence: "medium",
      fieldsRequiringConfirmation: ["type", "title", "provider", "reference"],
      type: isReservationType(type) ? type : undefined,
      title,
      provider: values.get("provider"),
      reference: values.get("reference"),
    };
    return parseReservationDraft(draft);
  }
}

export class InMemoryReservationsModule implements ReservationsModule {
  private readonly reservations: Reservation[] = [];

  async list(tripId: UUID): Promise<Reservation[]> {
    return this.reservations.filter((item) => item.tripId === tripId);
  }

  async findDuplicate(
    tripId: UUID,
    draft: ReservationDraft,
  ): Promise<Reservation | null> {
    const fingerprint = reservationFingerprint(draft);
    return (
      this.reservations.find(
        (item) =>
          item.tripId === tripId &&
          reservationFingerprint({
            type: item.type,
            title: item.title,
            provider: item.provider,
            reference: item.reference,
            start: item.start,
            confidence: "high",
            fieldsRequiringConfirmation: [],
          }) === fingerprint,
      ) ?? null
    );
  }

  async confirm(input: ReservationConfirmation): Promise<Reservation> {
    validateDraftForConfirmation(input.draft);
    const required = new Set(input.draft.fieldsRequiringConfirmation);
    const confirmed = new Set(input.confirmedFields);
    const missing = [...required].filter((field) => !confirmed.has(field));
    if (missing.length > 0)
      throw new Error(`Confirm these fields before saving: ${missing.join(", ")}`);
    const duplicate = await this.findDuplicate(input.tripId, input.draft);
    if (duplicate) throw new Error("This reservation is already imported");
    const reservation: Reservation = {
      id: createUuid(),
      tripId: input.tripId,
      type: input.draft.type!,
      title: input.draft.title!.trim(),
      provider: input.draft.provider?.trim() || undefined,
      reference: input.draft.reference?.trim() || undefined,
      start: input.draft.start,
      end: input.draft.end,
      venue: input.draft.venue,
      origin: input.draft.origin,
      destination: input.draft.destination,
      confirmedAt: new Date().toISOString() as Reservation["confirmedAt"],
    };
    this.reservations.push(reservation);
    return reservation;
  }
}

function isReservationType(value: string | undefined): value is NonNullable<ReservationDraft["type"]> {
  return ["accommodation", "flight", "train", "ferry", "activity", "other"].includes(value ?? "");
}

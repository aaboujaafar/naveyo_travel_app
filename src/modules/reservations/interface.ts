import type {
  DocumentKind,
  Reservation,
  ReservationDraft,
  UUID,
} from "../_shared/model";

export interface ReservationImportSource {
  uri: string;
  kind: DocumentKind;
  fileName?: string;
  sizeBytes?: number;
}

export interface ReservationConfirmation {
  tripId: UUID;
  draft: ReservationDraft;
  confirmedFields: string[];
}

export type ReservationImportResult =
  | { state: "needs-confirmation"; draft: ReservationDraft }
  | { state: "duplicate"; draft: ReservationDraft; existing: Reservation }
  | { state: "error"; message: string };

export interface ReservationsModule {
  list(tripId: UUID): Promise<Reservation[]>;
  confirm(input: ReservationConfirmation): Promise<Reservation>;
  findDuplicate(
    tripId: UUID,
    draft: ReservationDraft,
  ): Promise<Reservation | null>;
}
export interface DocumentAnalyzer {
  analyze(source: ReservationImportSource): Promise<ReservationDraft>;
}

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

export interface PendingReservationImport {
  id: string;
  kind: "file" | "text";
  uri: string;
  text?: string;
  fileName?: string;
  mimeType?: string;
  createdAt: string;
  status: "new" | "seen" | "processing" | "failed" | "confirmed";
  error?: string;
}

export interface ReservationImportInbox {
  list(): Promise<PendingReservationImport[]>;
  remove(id: string): Promise<void>;
  updateStatus(
    id: string,
    status: PendingReservationImport["status"],
    error?: string,
  ): Promise<void>;
}

export interface ReservationDocumentTextExtractor {
  extract(fileUri: string, options?: { maxPages?: number }): Promise<string>;
}

export interface ReservationTextAnalyzer {
  analyze(input: { tripId: UUID; extractedText: string }): Promise<ReservationDraft>;
}

export type OnDeviceAnalysisStatus =
  | "available"
  | "deviceNotEligible"
  | "appleIntelligenceNotEnabled"
  | "modelNotReady"
  | "unavailable"
  | "unsupportedOS";

export interface OnDeviceReservationAnalysis {
  draft: ReservationDraft;
  /** Text read on the iPhone, reused for the remote fallback so OCR runs once. */
  extractedText: string;
  source: "on-device" | "heuristic";
}

/** OCR and structuring performed entirely on the iPhone. */
export interface OnDeviceReservationAnalyzer {
  status(): Promise<OnDeviceAnalysisStatus>;
  analyzeFile(fileUri: string, options?: { maxPages?: number }): Promise<OnDeviceReservationAnalysis>;
  analyzeText(text: string): Promise<OnDeviceReservationAnalysis>;
}

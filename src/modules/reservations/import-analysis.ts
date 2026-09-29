import type { ReservationDraft, UUID } from "../_shared/model";
import type {
  OnDeviceAnalysisStatus,
  OnDeviceReservationAnalysis,
  OnDeviceReservationAnalyzer,
  ReservationDocumentTextExtractor,
  ReservationTextAnalyzer,
} from "./interface";

export type ReservationAnalysisSource =
  | { kind: "file"; uri: string }
  | { kind: "text"; text: string };

export type ReservationAnalysisMode = "on-device" | "remote";

export interface ReservationAnalysisOutcome {
  draft: ReservationDraft;
  mode: ReservationAnalysisMode;
}

/** Raised when the iPhone could not structure the document and remote analysis was not allowed. */
export class OnDeviceAnalysisUnavailableError extends Error {
  constructor(readonly status: OnDeviceAnalysisStatus | "incomplete") {
    super(describeOnDeviceStatus(status));
    this.name = "OnDeviceAnalysisUnavailableError";
  }
}

export function describeOnDeviceStatus(status: OnDeviceAnalysisStatus | "incomplete"): string {
  switch (status) {
    case "available":
      return "Analyse sur l’iPhone disponible : rien n’est envoyé.";
    case "incomplete":
      return "L’iPhone n’a pas pu identifier cette réservation. Autorisez l’envoi du texte à l’assistant IA pour réessayer.";
    case "appleIntelligenceNotEnabled":
      return "Activez Apple Intelligence dans Réglages pour analyser sur l’iPhone, ou autorisez l’envoi du texte à l’assistant IA.";
    case "modelNotReady":
      return "Le modèle Apple Intelligence se télécharge encore. Réessayez plus tard ou autorisez l’envoi du texte à l’assistant IA.";
    case "deviceNotEligible":
    case "unsupportedOS":
      return "Cet iPhone ne permet pas l’analyse locale. Autorisez l’envoi du texte à l’assistant IA pour continuer.";
    default:
      return "L’analyse sur l’iPhone est indisponible. Autorisez l’envoi du texte à l’assistant IA pour continuer.";
  }
}

/**
 * On-device first: OCR and structuring run on the iPhone. The extracted text is sent
 * to the remote assistant only when the iPhone cannot produce a draft and the
 * traveller explicitly allowed it.
 */
export async function analyzeReservationSource(input: {
  tripId: UUID;
  source: ReservationAnalysisSource;
  allowRemote: boolean;
  onDevice?: OnDeviceReservationAnalyzer;
  extractor?: ReservationDocumentTextExtractor;
  remote?: ReservationTextAnalyzer;
}): Promise<ReservationAnalysisOutcome> {
  const { source, onDevice } = input;
  let local: OnDeviceReservationAnalysis | null = null;
  if (onDevice) {
    if (source.kind === "file") {
      // OCR failures (unreadable file) are not recoverable remotely: the remote step needs this text.
      local = await onDevice.analyzeFile(source.uri, { maxPages: 50 });
    } else {
      try {
        local = await onDevice.analyzeText(source.text);
      } catch {
        local = null;
      }
    }
    if (local?.source === "on-device") return { draft: local.draft, mode: "on-device" };
  }

  if (!input.allowRemote) {
    const status = onDevice ? await onDevice.status().catch(() => "unavailable" as const) : "unsupportedOS";
    throw new OnDeviceAnalysisUnavailableError(status === "available" ? "incomplete" : status);
  }
  if (!input.remote) throw new Error("L’analyse de document n’est pas configurée");

  const extractedText =
    local?.extractedText ??
    (source.kind === "file"
      ? await requireExtractor(input.extractor).extract(source.uri, { maxPages: 50 })
      : source.text);
  const draft = await input.remote.analyze({ tripId: input.tripId, extractedText });
  return { draft, mode: "remote" };
}

function requireExtractor(extractor?: ReservationDocumentTextExtractor): ReservationDocumentTextExtractor {
  if (!extractor) throw new Error("L’analyse de document n’est pas configurée");
  return extractor;
}

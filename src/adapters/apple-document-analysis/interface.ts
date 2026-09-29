import type { ReservationDraft } from '../../modules/_shared/model'

export type { PendingReservationImport } from '../../modules/reservations'

export interface DocumentAnalysisOptions {
  sourceDocumentId?: string
  maxPages?: number
}

export interface DocumentEvidence {
  kind: 'address' | 'date' | 'amount' | 'flightNumber' | 'text'
  value: string
  page?: number
}

export interface DocumentAnalysisResult extends ReservationDraft {
  evidence: DocumentEvidence[]
  extractedText: string
  pagesAnalyzed: number
  /** `on-device` when Apple Intelligence produced the draft; `heuristic` is only a weak fallback. */
  draftSource: 'on-device' | 'heuristic'
}

export interface AppleDocumentAnalysisModule {
  analyzeDocument(fileUri: string, options?: DocumentAnalysisOptions): Promise<unknown>
  extractDocumentText?(fileUri: string, options?: DocumentAnalysisOptions): Promise<unknown>
  analyzeText?(text: string): Promise<unknown>
  onDeviceAnalysisStatus?(): Promise<unknown>
  listPendingShareImports?(): Promise<unknown>
  removePendingShareImport?(id: string): Promise<void>
  updatePendingShareImportStatus?(id: string, status: string, error?: string): Promise<void>
}

export interface AppleDocumentAnalyzer {
  analyze(fileUri: string, options?: DocumentAnalysisOptions): Promise<DocumentAnalysisResult>
}

import type { ReservationDraft } from '../../modules/_shared/model'

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
}

export interface AppleDocumentAnalysisModule {
  analyzeDocument(fileUri: string, options?: DocumentAnalysisOptions): Promise<unknown>
  listPendingShareImports?(): Promise<unknown>
  removePendingShareImport?(id: string): Promise<void>
}

export interface PendingShareImport {
  id: string
  kind: 'file' | 'text'
  uri: string
  text?: string
  fileName?: string
  mimeType?: string
  createdAt: string
}

export interface AppleDocumentAnalyzer {
  analyze(fileUri: string, options?: DocumentAnalysisOptions): Promise<DocumentAnalysisResult>
}

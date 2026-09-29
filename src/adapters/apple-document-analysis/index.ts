import { requireNativeModule } from "expo";
import type { DocumentAnalyzer, OnDeviceAnalysisStatus, OnDeviceReservationAnalysis, OnDeviceReservationAnalyzer, ReservationImportSource } from '../../modules/reservations'
import type { AppleDocumentAnalysisModule, AppleDocumentAnalyzer, DocumentAnalysisOptions, DocumentAnalysisResult, PendingReservationImport } from './interface'
import { assertPageLimit, parseDocumentAnalysisResult } from './validation'

const nativeModule = (): AppleDocumentAnalysisModule => {
  return requireNativeModule<AppleDocumentAnalysisModule>("NaveyoDocuments");
}

export const createAppleDocumentAnalyzer = (moduleOverride?: AppleDocumentAnalysisModule): AppleDocumentAnalyzer => ({
  async analyze(fileUri: string, options?: DocumentAnalysisOptions): Promise<DocumentAnalysisResult> {
    const result = parseDocumentAnalysisResult(await (moduleOverride ?? nativeModule()).analyzeDocument(fileUri, options))
    assertPageLimit(result.pagesAnalyzed, options?.maxPages)
    return result
  },
})

export const createAppleReservationAnalyzer = (moduleOverride?: AppleDocumentAnalysisModule): DocumentAnalyzer => {
  const analyzer = createAppleDocumentAnalyzer(moduleOverride)
  return {
    async analyze(source: ReservationImportSource) {
      return analyzer.analyze(source.uri, { sourceDocumentId: source.fileName })
    },
  }
}

export const createAppleDocumentTextExtractor = (moduleOverride?: AppleDocumentAnalysisModule) => ({
  async extract(fileUri: string, options?: DocumentAnalysisOptions): Promise<string> {
    const module = moduleOverride ?? nativeModule()
    if (!module.extractDocumentText) throw new Error('Native text extraction is unavailable')
    const value = await module.extractDocumentText(fileUri, options)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid native text extraction result')
    const extractedText = (value as Record<string, unknown>).extractedText
    if (typeof extractedText !== 'string' || extractedText.trim().length === 0) throw new Error('No text could be extracted from this document')
    return extractedText
  },
})

const onDeviceStatuses: readonly OnDeviceAnalysisStatus[] = ['available', 'deviceNotEligible', 'appleIntelligenceNotEnabled', 'modelNotReady', 'unavailable', 'unsupportedOS']

const toOnDeviceAnalysis = (result: DocumentAnalysisResult): OnDeviceReservationAnalysis => {
  const { evidence: _evidence, extractedText, pagesAnalyzed: _pages, draftSource, ...draft } = result
  void _evidence
  void _pages
  return { draft, extractedText, source: draftSource }
}

/** OCR (Vision/PDFKit) and structuring (Apple Intelligence) without any network call. */
export const createAppleOnDeviceReservationAnalyzer = (moduleOverride?: AppleDocumentAnalysisModule): OnDeviceReservationAnalyzer => {
  const analyzer = createAppleDocumentAnalyzer(moduleOverride)
  return {
    async status() {
      const module = moduleOverride ?? nativeModule()
      if (!module.onDeviceAnalysisStatus) return 'unsupportedOS'
      const value = await module.onDeviceAnalysisStatus()
      return onDeviceStatuses.includes(value as OnDeviceAnalysisStatus) ? value as OnDeviceAnalysisStatus : 'unavailable'
    },
    async analyzeFile(fileUri, options) {
      return toOnDeviceAnalysis(await analyzer.analyze(fileUri, options))
    },
    async analyzeText(text) {
      const module = moduleOverride ?? nativeModule()
      if (!module.analyzeText) throw new Error('Native text analysis is unavailable')
      return toOnDeviceAnalysis(parseDocumentAnalysisResult(await module.analyzeText(text)))
    },
  }
}

export const createAppleShareInbox = (moduleOverride?: AppleDocumentAnalysisModule) => ({
  async list(): Promise<PendingReservationImport[]> {
    const module = moduleOverride ?? nativeModule()
    if (!module.listPendingShareImports) return []
    const value = await module.listPendingShareImports()
    if (!Array.isArray(value)) return []
    return value.map((item) => {
      if (item && typeof item === 'object' && !(item as Record<string, unknown>).status) {
        return { ...(item as Record<string, unknown>), status: 'seen' }
      }
      return item
    }).filter((item): item is PendingReservationImport => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Record<string, unknown>
      return typeof candidate.id === 'string' && (candidate.kind === 'file' || candidate.kind === 'text') && typeof candidate.uri === 'string' && typeof candidate.createdAt === 'string' && ['new', 'seen', 'processing', 'failed', 'confirmed'].includes(String(candidate.status))
    })
  },
  async remove(id: string): Promise<void> {
    const module = moduleOverride ?? nativeModule()
    await module.removePendingShareImport?.(id)
  },
  async updateStatus(id: string, status: PendingReservationImport['status'], error?: string): Promise<void> {
    const module = moduleOverride ?? nativeModule()
    await module.updatePendingShareImportStatus?.(id, status, error)
  },
})

export type { AppleDocumentAnalysisModule, AppleDocumentAnalyzer, DocumentAnalysisOptions, DocumentAnalysisResult, DocumentEvidence, PendingReservationImport } from './interface'
export type { PendingReservationImport as PendingShareImport } from './interface'
export { assertDocumentSize, assertPageLimit, documentAnalysisLimits, parseDocumentAnalysisResult } from './validation'

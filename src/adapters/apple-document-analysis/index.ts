import { requireNativeModule } from "expo";
import type { DocumentAnalyzer, ReservationImportSource } from '../../modules/reservations'
import type { AppleDocumentAnalysisModule, AppleDocumentAnalyzer, DocumentAnalysisOptions, DocumentAnalysisResult, PendingShareImport } from './interface'
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

export const createAppleShareInbox = (moduleOverride?: AppleDocumentAnalysisModule) => ({
  async list(): Promise<PendingShareImport[]> {
    const module = moduleOverride ?? nativeModule()
    if (!module.listPendingShareImports) return []
    const value = await module.listPendingShareImports()
    if (!Array.isArray(value)) return []
    return value.filter((item): item is PendingShareImport => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Record<string, unknown>
      return typeof candidate.id === 'string' && (candidate.kind === 'file' || candidate.kind === 'text') && typeof candidate.uri === 'string' && typeof candidate.createdAt === 'string'
    })
  },
  async remove(id: string): Promise<void> {
    const module = moduleOverride ?? nativeModule()
    await module.removePendingShareImport?.(id)
  },
})

export type { AppleDocumentAnalysisModule, AppleDocumentAnalyzer, DocumentAnalysisOptions, DocumentAnalysisResult, DocumentEvidence, PendingShareImport } from './interface'
export { assertDocumentSize, assertPageLimit, documentAnalysisLimits, parseDocumentAnalysisResult } from './validation'

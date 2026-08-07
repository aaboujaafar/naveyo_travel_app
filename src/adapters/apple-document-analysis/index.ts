import type { DocumentAnalyzer, ReservationImportSource } from '../../modules/reservations'
import type { AppleDocumentAnalysisModule, AppleDocumentAnalyzer, DocumentAnalysisOptions, DocumentAnalysisResult } from './interface'
import { assertPageLimit, parseDocumentAnalysisResult } from './validation'

const nativeModule = (): AppleDocumentAnalysisModule => {
  const moduleValue = (globalThis as { NaveyoDocuments?: AppleDocumentAnalysisModule }).NaveyoDocuments
  if (!moduleValue) throw new Error('Naveyo document analysis native module is unavailable; use an iOS development build')
  return moduleValue
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

export type { AppleDocumentAnalysisModule, AppleDocumentAnalyzer, DocumentAnalysisOptions, DocumentAnalysisResult, DocumentEvidence } from './interface'
export { assertDocumentSize, assertPageLimit, documentAnalysisLimits, parseDocumentAnalysisResult } from './validation'

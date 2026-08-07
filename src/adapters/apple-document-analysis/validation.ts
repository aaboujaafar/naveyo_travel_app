import type { ReservationDraft } from '../../modules/_shared/model'
import { parseReservationDraft } from '../../modules/_shared/validation'
import type { DocumentAnalysisResult, DocumentEvidence } from './interface'

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024
const MAX_DOCUMENT_PAGES = 50

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value as Record<string, unknown>
}

const stringValue = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length > 20_000) throw new Error(`${label} must be a bounded string`)
  return value
}

const evidenceKind = (value: unknown): DocumentEvidence['kind'] => {
  if (value === 'address' || value === 'date' || value === 'amount' || value === 'flightNumber' || value === 'text') return value
  throw new Error('Invalid document evidence kind')
}

export const parseDocumentAnalysisResult = (value: unknown): DocumentAnalysisResult => {
  const candidate = record(value, 'Document analysis result')
  const pagesAnalyzed = candidate.pagesAnalyzed
  if (typeof pagesAnalyzed !== 'number' || !Number.isInteger(pagesAnalyzed) || pagesAnalyzed < 1 || pagesAnalyzed > MAX_DOCUMENT_PAGES) throw new Error('Invalid analyzed page count')

  const rawEvidence = candidate.evidence
  if (!Array.isArray(rawEvidence) || rawEvidence.length > 200) throw new Error('Invalid document evidence')
  const evidence = rawEvidence.map((item) => {
    const entry = record(item, 'Document evidence')
    const result: DocumentEvidence = { kind: evidenceKind(entry.kind), value: stringValue(entry.value, 'Evidence value') }
    if (entry.page !== undefined) {
      if (typeof entry.page !== 'number' || !Number.isInteger(entry.page) || entry.page < 1 || entry.page > pagesAnalyzed) throw new Error('Invalid evidence page')
      result.page = entry.page
    }
    return result
  })

  const extractedText = stringValue(candidate.extractedText, 'Extracted text')
  const draft = parseReservationDraft(candidate.draft) as ReservationDraft
  return { ...draft, evidence, extractedText, pagesAnalyzed }
}

export const assertDocumentSize = (byteSize: number): void => {
  if (!Number.isInteger(byteSize) || byteSize <= 0 || byteSize > MAX_DOCUMENT_BYTES) throw new Error('Document exceeds the 25 MB limit')
}

export const assertPageLimit = (pageCount: number, maxPages = MAX_DOCUMENT_PAGES): void => {
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > Math.min(maxPages, MAX_DOCUMENT_PAGES)) throw new Error('Document exceeds the page limit')
}

export const documentAnalysisLimits = { maxBytes: MAX_DOCUMENT_BYTES, maxPages: MAX_DOCUMENT_PAGES } as const

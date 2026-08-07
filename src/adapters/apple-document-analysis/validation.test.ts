import { describe, expect, it } from 'vitest'
import { assertDocumentSize, assertPageLimit, parseDocumentAnalysisResult } from './validation'

const validResult = {
  pagesAnalyzed: 1,
  extractedText: 'Flight AF123 Paris to Athens',
  evidence: [{ kind: 'flightNumber', value: 'AF123', page: 1 }],
  draft: { type: 'flight', title: 'Paris to Athens', confidence: 'low', fieldsRequiringConfirmation: ['type', 'title', 'reference'] },
}

describe('Apple document analysis validation', () => {
  it('accepts a serializable draft and preserves evidence', () => {
    expect(parseDocumentAnalysisResult(validResult)).toMatchObject({ pagesAnalyzed: 1, evidence: [{ value: 'AF123' }], confidence: 'low' })
  })

  it('rejects malformed evidence and invalid pages', () => {
    expect(() => parseDocumentAnalysisResult({ ...validResult, evidence: [{ kind: 'unknown', value: 'x' }] })).toThrow('Invalid document evidence kind')
    expect(() => parseDocumentAnalysisResult({ ...validResult, pagesAnalyzed: 0 })).toThrow('Invalid analyzed page count')
  })

  it('enforces document and page limits', () => {
    expect(() => assertDocumentSize(25 * 1024 * 1024 + 1)).toThrow('25 MB')
    expect(() => assertPageLimit(51)).toThrow('page limit')
    expect(() => assertPageLimit(3, 2)).toThrow('page limit')
  })

  it('requires confirmation for every extracted draft field', () => {
    const result = parseDocumentAnalysisResult(validResult)
    expect(result.fieldsRequiringConfirmation).toEqual(['type', 'title', 'reference'])
  })
})

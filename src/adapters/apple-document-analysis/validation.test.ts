import { describe, expect, it, vi } from 'vitest'
import { assertDocumentSize, assertPageLimit, parseDocumentAnalysisResult } from './validation'
import { createAppleOnDeviceReservationAnalyzer } from '.'

// The adapter entry imports Expo's native bridge; tests always inject a fake module.
vi.mock('expo', () => ({ requireNativeModule: () => { throw new Error('native module unavailable in tests') } }))

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

  it('reports whether the draft came from Apple Intelligence', () => {
    expect(parseDocumentAnalysisResult(validResult).draftSource).toBe('heuristic')
    expect(parseDocumentAnalysisResult({ ...validResult, draftSource: 'on-device' }).draftSource).toBe('on-device')
  })

  it('exposes on-device analysis of pasted text and the model status', async () => {
    const analyzer = createAppleOnDeviceReservationAnalyzer({
      analyzeDocument: async () => validResult,
      analyzeText: async () => ({ ...validResult, draftSource: 'on-device' }),
      onDeviceAnalysisStatus: async () => 'appleIntelligenceNotEnabled',
    })
    await expect(analyzer.status()).resolves.toBe('appleIntelligenceNotEnabled')
    await expect(analyzer.analyzeText('Flight AF123')).resolves.toMatchObject({
      source: 'on-device',
      extractedText: 'Flight AF123 Paris to Athens',
      draft: { type: 'flight', title: 'Paris to Athens' },
    })
    await expect(analyzer.analyzeFile('file:///doc.pdf')).resolves.toMatchObject({ source: 'heuristic' })
  })

  it('treats an older native build without status as unsupported', async () => {
    const analyzer = createAppleOnDeviceReservationAnalyzer({ analyzeDocument: async () => validResult })
    await expect(analyzer.status()).resolves.toBe('unsupportedOS')
  })
})

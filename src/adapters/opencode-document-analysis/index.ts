import type { ReservationDraft, UUID } from '../../modules/_shared/model'
import { parseReservationDraft } from '../../modules/_shared/validation'
import type { SupabaseClientLike } from '../supabase/identity/client'

export interface RemoteDocumentAnalysisInput {
  tripId: UUID
  extractedText: string
}

interface RemoteDocumentAnalysisResponse {
  draft?: unknown
  error?: unknown
}

const defaultEndpoint = `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''}/functions/v1/document-analysis`

export function createOpenCodeDocumentAnalyzer(
  client: SupabaseClientLike,
  endpoint = defaultEndpoint,
) {
  return {
    async analyze(input: RemoteDocumentAnalysisInput): Promise<ReservationDraft> {
      const text = input.extractedText.trim()
      if (text.length === 0 || text.length > 20_000) throw new Error('Document text is empty or too large')
      const session = await client.auth.getSession()
      const accessToken = session.data?.session?.access_token
      if (session.error || !accessToken) throw new Error('Authentication is required for document analysis')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60_000)
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({ tripId: input.tripId, extractedText: text }),
        })
        let body: RemoteDocumentAnalysisResponse
        try {
          body = (await response.json()) as RemoteDocumentAnalysisResponse
        } catch {
          throw new Error('Remote document analysis returned invalid JSON')
        }
        if (!response.ok || body.draft === undefined) {
          const message = typeof body.error === 'string' ? body.error : 'Remote document analysis failed'
          throw new Error(message)
        }
        try {
          return parseReservationDraft(body.draft)
        } catch (error) {
          throw new Error(`OpenCode returned an invalid reservation draft: ${error instanceof Error ? error.message : 'validation failed'}`)
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('Remote document analysis timed out')
        }
        throw error
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}

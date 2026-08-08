import type { ReservationDraft, UUID } from '../../modules/_shared/model'
import type { SupabaseClientLike } from '../supabase/identity/client'

export interface RemoteDocumentAnalysisInput {
  tripId: UUID
  extractedText: string
}

interface RemoteDocumentAnalysisResponse {
  draft?: ReservationDraft
  error?: string
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

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripId: input.tripId, extractedText: text }),
      })
      const body = (await response.json()) as RemoteDocumentAnalysisResponse
      if (!response.ok || !body.draft) throw new Error(body.error ?? 'Remote document analysis failed')
      return body.draft
    },
  }
}

import type { SuggestionDraft, SuggestPlacesInput, TripAssistant } from '../../../modules/trip-assistant'
import type { SupabaseClientLike } from '../identity/client'

type ResponseBody = { drafts?: SuggestionDraft[]; error?: string }

export function createSupabaseTripAssistant(
  client: SupabaseClientLike,
  endpoint = `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''}/functions/v1/trip-assistant`,
): TripAssistant {
  return {
    async suggestPlaces(input: SuggestPlacesInput): Promise<SuggestionDraft[]> {
      const session = await client.auth.getSession()
      if (session.error || !session.data?.session?.access_token) {
        throw new Error('Authentication is required for suggestions')
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
      const body = (await response.json()) as ResponseBody
      if (!response.ok) {
        throw new Error(body.error ?? 'Suggestions are temporarily unavailable')
      }
      return body.drafts ?? []
    },
  }
}

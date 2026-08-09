import type { SuggestionDraft, SuggestPlacesInput, TripAssistant } from '../../../modules/trip-assistant'
import type { SupabaseClientLike } from '../identity/client'

type ResponseBody = {
  drafts?: SuggestionDraft[]
  error?: string
  message?: string
  trip?: Record<string, unknown>
  stop?: Record<string, unknown>
}

export type TripAssistantDebugContext = {
  trip: Record<string, unknown> | null
  stop: Record<string, unknown> | null
}

let lastDebugContext: TripAssistantDebugContext = { trip: null, stop: null }

export function getLastTripAssistantDebugContext(): TripAssistantDebugContext {
  return lastDebugContext
}

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
          apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
          Authorization: `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
      const rawBody = await response.text()
      let body: ResponseBody = {}
      try {
        body = JSON.parse(rawBody) as ResponseBody
      } catch {
        throw new Error(`Suggestions service returned ${response.status}`)
      }
      lastDebugContext = {
        trip: body.trip ?? null,
        stop: body.stop ?? null,
      }
      if (!response.ok) {
        throw new Error(body.error ?? body.message ?? `Suggestions service returned ${response.status}`)
      }
      return body.drafts ?? []
    },
  }
}

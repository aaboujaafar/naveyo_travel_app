import type { PlaceCandidate, UUID } from '../_shared/model'
import { assertStableId, parsePlaceCandidate } from '../_shared/validation'
import type { SuggestPlacesInput, TripAssistant, TripAssistantDependencies, TripAssistantOptions } from './interface'
import type { SuggestionDraft, SuggestionDraftStore } from './model'

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_MAX_CANDIDATES = 50
const DEFAULT_MAX_SUGGESTIONS = 5

export class SuggestionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'SuggestionError'
  }
}

export class SuggestionTimeoutError extends SuggestionError {
  constructor() { super('SUGGESTIONS_TIMEOUT', 'Suggestions provider timed out') }
}

export class SuggestionInvalidOutputError extends SuggestionError {
  constructor(message = 'Suggestions provider returned an invalid response') { super('SUGGESTIONS_INVALID_OUTPUT', message) }
}

export class SuggestionUsageLimitError extends SuggestionError {
  constructor() { super('SUGGESTIONS_USAGE_LIMIT', 'Suggestion usage limit reached') }
}

const withTimeout = async <T>(work: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new SuggestionTimeoutError()), timeoutMs) }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const nonEmptyText = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 500) throw new SuggestionInvalidOutputError(`Invalid suggestion ${field}`)
  return value.trim()
}

export function parseSuggestionOutput(value: unknown, candidates: PlaceCandidate[], now: string, tripId: UUID, stopId: UUID, id: () => UUID, maxSuggestions = DEFAULT_MAX_SUGGESTIONS): SuggestionDraft[] {
  let parsed: unknown = value
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch { throw new SuggestionInvalidOutputError('Suggestions output is not JSON') }
  }
  const record = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined
  const values = record?.suggestions
  if (!Array.isArray(values) || values.length > maxSuggestions) throw new SuggestionInvalidOutputError('Suggestions must contain between zero and five items')
  const candidateIds = new Set(candidates.map((candidate) => candidate.id))
  const seen = new Set<UUID>()
  return values.map((item): SuggestionDraft => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new SuggestionInvalidOutputError()
    const suggestion = item as Record<string, unknown>
    if (typeof suggestion.candidateId !== 'string') throw new SuggestionInvalidOutputError('Suggestion candidateId is required')
    let candidateId: UUID
    try { candidateId = assertStableId(suggestion.candidateId) } catch { throw new SuggestionInvalidOutputError('Suggestion candidateId is not a UUID') }
    if (!candidateIds.has(candidateId)) throw new SuggestionInvalidOutputError('Suggestion candidateId is not among the supplied candidates')
    if (seen.has(candidateId)) throw new SuggestionInvalidOutputError('Suggestion candidates must be unique')
    seen.add(candidateId)
    return { id: id(), tripId, stopId, candidateId, title: nonEmptyText(suggestion.title, 'title'), reason: nonEmptyText(suggestion.reason, 'reason'), createdAt: now }
  })
}

export class TripAssistantService implements TripAssistant {
  private readonly options: Required<Pick<TripAssistantOptions, 'timeoutMs' | 'maxCandidates' | 'maxSuggestions'>> & Omit<TripAssistantOptions, 'timeoutMs' | 'maxCandidates' | 'maxSuggestions'>

  constructor(private readonly dependencies: TripAssistantDependencies, options: TripAssistantOptions = {}) {
    this.options = { timeoutMs: DEFAULT_TIMEOUT_MS, maxCandidates: DEFAULT_MAX_CANDIDATES, maxSuggestions: DEFAULT_MAX_SUGGESTIONS, ...options }
  }

  async suggestPlaces(input: SuggestPlacesInput): Promise<SuggestionDraft[]> {
    const query = input.query.trim()
    if (query.length < 2 || query.length > 160) throw new SuggestionInvalidOutputError('Suggestion search query must contain 2 to 160 characters')
    if (this.options.usageLimit && !this.options.usageLimit.consume(input.tripId)) throw new SuggestionUsageLimitError()
    const candidates = await withTimeout(this.dependencies.placesProvider.search({ query, tripId: input.tripId, stopId: input.stopId, stopName: input.stopName, countryCode: input.countryCode, ...input.placeSearch }), this.options.timeoutMs)
    const validCandidates = candidates.slice(0, this.options.maxCandidates).map((candidate) => parsePlaceCandidate(candidate))
    const uniqueCandidates = [...new Map(validCandidates.map((candidate) => [candidate.id, candidate])).values()]
    if (uniqueCandidates.length === 0) return []
    const output = await withTimeout(this.dependencies.model.complete({ tripId: input.tripId, stopId: input.stopId, stopName: input.stopName, countryCode: input.countryCode, timeZone: input.timeZone, preferences: input.preferences?.trim(), weather: input.weather, existingItinerary: input.existingItinerary, candidates: uniqueCandidates }), this.options.timeoutMs)
    const drafts = parseSuggestionOutput(output, uniqueCandidates, this.options.now?.() ?? new Date().toISOString(), input.tripId, input.stopId, this.options.id ?? (() => assertStableId(crypto.randomUUID())), this.options.maxSuggestions)
    await this.dependencies.draftStore.save(drafts)
    return drafts
  }
}

export class InMemorySuggestionDraftStore implements SuggestionDraftStore {
  private readonly drafts: SuggestionDraft[] = []

  async save(drafts: SuggestionDraft[]): Promise<void> { this.drafts.push(...drafts.map((draft) => ({ ...draft }))) }

  async list(tripId: UUID, stopId?: UUID): Promise<SuggestionDraft[]> {
    return this.drafts.filter((draft) => draft.tripId === tripId && (stopId === undefined || draft.stopId === stopId)).map((draft) => ({ ...draft }))
  }
}

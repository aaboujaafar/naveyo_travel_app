import type { UUID } from './model'

export const uuid = (value: string): UUID => value as UUID
export const now = (value = '2026-07-28T10:00:00.000Z') => value as `${string}T${string}Z` & { readonly __brand: 'ISODateTime' }

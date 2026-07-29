import type { Coordinates, ISO4217, IANATimeZone, ISODateTime, Money, UUID } from './model'

export const isUuid = (value: string): value is UUID =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export const isIsoDateTime = (value: string): value is ISODateTime =>
  !Number.isNaN(Date.parse(value)) && /T/.test(value)

export const isIanaTimeZone = (value: string): value is IANATimeZone => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return value.includes('/')
  } catch { return false }
}

export const isCurrency = (value: string): value is ISO4217 => /^[A-Z]{3}$/.test(value)

export const parseMoney = (value: unknown): Money => {
  if (!value || typeof value !== 'object') throw new Error('Money must be an object')
  const candidate = value as Record<string, unknown>
  if (!Number.isSafeInteger(candidate.minorUnits) || (candidate.minorUnits as number) < 0 || typeof candidate.currency !== 'string' || !isCurrency(candidate.currency)) {
    throw new Error('Invalid money')
  }
  return { minorUnits: candidate.minorUnits as number, currency: candidate.currency }
}

export const parseCoordinates = (value: unknown): Coordinates => {
  if (!value || typeof value !== 'object') throw new Error('Coordinates must be an object')
  const candidate = value as Record<string, unknown>
  if (typeof candidate.latitude !== 'number' || candidate.latitude < -90 || candidate.latitude > 90 || typeof candidate.longitude !== 'number' || candidate.longitude < -180 || candidate.longitude > 180) throw new Error('Invalid coordinates')
  return { latitude: candidate.latitude, longitude: candidate.longitude }
}

export const assertStableId = (id: string): UUID => {
  if (!isUuid(id)) throw new Error('Expected a stable UUID')
  return id
}

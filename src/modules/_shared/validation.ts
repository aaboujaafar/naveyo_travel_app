import type { Coordinates, ISO4217, IANATimeZone, ISODateTime, Money, UUID } from './model'

export const isUuid = (value: string): value is UUID =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export const isIsoDateTime = (value: string): value is ISODateTime =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  !Number.isNaN(Date.parse(value))

export const isIanaTimeZone = (value: string): value is IANATimeZone => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
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
  const latitude = candidate.latitude
  const longitude = candidate.longitude
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) throw new Error('Invalid coordinates')
  return { latitude, longitude }
}

export const assertStableId = (id: string): UUID => {
  if (!isUuid(id)) throw new Error('Expected a stable UUID')
  return id
}

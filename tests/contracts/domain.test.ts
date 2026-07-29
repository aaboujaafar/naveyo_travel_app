import { describe, expect, it } from 'vitest'
import { expense, place, reservationDraft, stop, trackPoint, tripId, tripPack, voyage } from '../../src/modules/__fixtures__/domain'
import { FakeOfflineTripPack, FakePlacesProvider, FakeTrips } from './fakes'
import { assertStableId, isIanaTimeZone, isIsoDateTime, parseCoordinates, parseMoney } from '../../src/modules/_shared/validation'

describe('ARC-001 domain contracts', () => {
  it('keeps local dates and IANA timezone on a stop', () => {
    expect(stop.startDate).toBe('2026-09-04')
    expect(stop.timeZone).toBe('Europe/Lisbon')
    expect(isIanaTimeZone(stop.timeZone)).toBe(true)
    expect(isIanaTimeZone('UTC')).toBe(true)
    expect(isIsoDateTime('2026-09-05T10:00')).toBe(false)
  })

  it('represents money in integer minor units and preserves currencies', () => {
    expect(parseMoney(expense.original)).toEqual({ minorUnits: 330, currency: 'EUR' })
    expect(() => parseMoney({ minorUnits: 1.5, currency: 'EUR' })).toThrow()
  })

  it('keeps typed place semantics and validates external coordinates', () => {
    expect(place.coordinates.latitude).toBeGreaterThanOrEqual(-90)
    expect(parseCoordinates(place.coordinates)).toEqual(place.coordinates)
    expect(() => parseCoordinates({ latitude: 100, longitude: 0 })).toThrow()
    expect(() => parseCoordinates({ latitude: Number.NaN, longitude: 0 })).toThrow()
  })

  it('requires stable ids and UTC instants when present', () => {
    expect(assertStableId(tripId)).toBe(tripId)
    expect(isIsoDateTime(voyage.createdAt)).toBe(true)
    expect(() => assertStableId('temporary-id')).toThrow()
  })

  it('uses module interfaces through fakes', async () => {
    const trips = new FakeTrips(voyage, [stop])
    const places = new FakePlacesProvider([place])
    const pack = new FakeOfflineTripPack()
    expect(await trips.get(tripId)).toEqual(voyage)
    expect(await places.getById(place.id)).toEqual(place)
    expect(await places.search({ query: 'belém', countryCode: 'PT' })).toEqual([place])
    expect(await pack.get(tripId)).toBeNull()
    await pack.replace(tripPack)
    expect((await pack.manifest(tripId))?.schemaVersion).toBe(1)
    const createdStop = await trips.createStop({ tripId, name: 'Porto', countryCode: 'PT', timeZone: stop.timeZone, startDate: '2026-09-08', endDate: '2026-09-10' })
    expect(assertStableId(createdStop.id)).toBe(createdStop.id)
    expect(await trips.listStops(tripId)).toHaveLength(2)
  })

  it('keeps draft reservations and trip tracking idempotency data explicit', () => {
    expect(reservationDraft.sourceDocumentId).toBeDefined()
    expect(reservationDraft.confidence).toBe('high')
    expect(reservationDraft.fieldsRequiringConfirmation).toContain('provider')
    expect(trackPoint.idempotencyKey).toMatch(/^track-/)
    expect(isIsoDateTime(trackPoint.recordedAt)).toBe(true)
  })
})

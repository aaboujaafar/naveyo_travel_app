import { describe, expect, it } from 'vitest'
import type { ItineraryItem, PlaceCandidate, Stop, UUID } from '../_shared/model'
import { buildItineraryDays, sortItineraryItems } from './interface'
import { InMemoryItineraryModule } from './in-memory'
import { PermissionDeniedMapAdapter, regionForPoints, UnavailableMapAdapter } from '../../adapters/map'

const tripId = '00000000-0000-4000-8000-000000000001' as UUID
const firstStop: Stop = {
  id: '00000000-0000-4000-8000-000000000101' as UUID,
  tripId,
  name: 'Tokyo',
  countryCode: 'JP',
  timeZone: 'Asia/Tokyo' as Stop['timeZone'],
  startDate: '2026-09-01',
  endDate: '2026-09-02',
}
const secondStop: Stop = {
  ...firstStop,
  id: '00000000-0000-4000-8000-000000000102' as UUID,
  name: 'Paris',
  timeZone: 'Europe/Paris' as Stop['timeZone'],
  startDate: '2026-09-03',
  endDate: '2026-09-03',
}

function item(id: string, stopId: UUID, date: string, local?: string): ItineraryItem {
  return { id: id as UUID, tripId, stopId, title: id, date, time: local ? { local, timeZone: firstStop.timeZone } : undefined }
}

describe('itinerary module', () => {
  it('creates a day for each local date of an individual stop', () => {
    const days = buildItineraryDays([], [firstStop])
    expect(days.map((day) => day.date)).toEqual(['2026-09-01', '2026-09-02'])
    expect(days[0]?.stop.timeZone).toBe('Asia/Tokyo')
  })

  it('orders by stop local dates and then local time, never by phone timezone', () => {
    const items = [
      item('late', secondStop.id, '2026-09-03', '18:00'),
      item('morning', firstStop.id, '2026-09-01', '09:00'),
      item('early', firstStop.id, '2026-09-01', '08:00'),
    ]
    expect(sortItineraryItems(items, [secondStop, firstStop]).map((entry) => entry.title)).toEqual(['early', 'morning', 'late'])
  })

  it('adds a confirmed place and keeps its venue coordinates', async () => {
    const module = new InMemoryItineraryModule()
    const place: PlaceCandidate = {
      id: '00000000-0000-4000-8000-000000000201' as UUID,
      provider: 'manual',
      name: 'Senso-ji',
      coordinates: { latitude: 35.7148, longitude: 139.7967 },
    }
    const added = await module.addConfirmedPlace({ tripId, stopId: firstStop.id, date: '2026-09-01', title: place.name, place })
    expect(added.place?.kind).toBe('venue')
    expect(added.place?.coordinates).toEqual(place.coordinates)
  })

  it('rejects ordinary itinerary mutations while offline', async () => {
    const module = new InMemoryItineraryModule()
    module.setOnline(false)
    await expect(module.add({ tripId, stopId: firstStop.id, title: 'Offline', date: '2026-09-01' })).rejects.toThrow('MUTATIONS_DISABLED_OFFLINE')
  })
})

describe('map adapter seam', () => {
  it('computes a useful region for many points and no region for an empty map', () => {
    expect(regionForPoints([])).toBeNull()
    const points = Array.from({ length: 200 }, (_, index) => ({
      id: String(index),
      label: `Point ${index}`,
      coordinates: { latitude: 35 + index / 1000, longitude: 139 + index / 1000 },
    }))
    expect(regionForPoints(points)).toMatchObject({ latitude: expect.any(Number), longitude: expect.any(Number) })
  })

  it('exposes degraded tile and permission-denied states behind the map seam', () => {
    const model = { points: [{ id: '1', label: 'Place', coordinates: { latitude: 1, longitude: 2 } }] }
    expect(new UnavailableMapAdapter().status(model)).toBe('tiles-unavailable')
    expect(new PermissionDeniedMapAdapter().status(model)).toBe('permission-denied')
    expect(new UnavailableMapAdapter().polyline({ ...model, polyline: [{ latitude: 1, longitude: 2 }] })).toEqual([])
  })
})

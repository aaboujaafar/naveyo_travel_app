import { describe, expect, it, vi } from 'vitest'
import { OfflineMutationError } from '../src/modules/trips'
import { createSupabaseTripsModule } from '../src/adapters/supabase/trips'
import { createSupabaseIdentityModule } from '../src/adapters/supabase/identity'
import type { SupabaseClientLike, SupabaseQuery, SupabaseResponse } from '../src/adapters/supabase/identity'
import type { Stop, Trip } from '../src/modules/_shared/model'

const request = <T>(response: SupabaseResponse<T>): SupabaseQuery<T> => ({
  then: (resolve) => Promise.resolve(response).then(resolve),
  select: () => request(response), insert: () => request(response), update: () => request(response), eq: () => request(response), order: () => request(response), single: () => request(response),
})

describe('TRP-001 Supabase trips adapter', () => {
  it('does not write ordinary trip mutations while offline', async () => {
    const from = vi.fn(() => request({ data: null, error: null }))
    const client = { from, auth: { getUser: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn() } } as unknown as SupabaseClientLike
    const trips = createSupabaseTripsModule(client, () => false)
    await expect(trips.create({ name: 'Lisbon', referenceCurrency: 'EUR' as Trip['referenceCurrency'] })).rejects.toBeInstanceOf(OfflineMutationError)
    await expect(trips.createStop({ tripId: '10000000-0000-4000-8000-000000000001' as Stop['tripId'], name: 'Lisbon', countryCode: 'PT', timeZone: 'Europe/Lisbon' as Stop['timeZone'], startDate: '2026-09-04', endDate: '2026-09-05' })).rejects.toBeInstanceOf(OfflineMutationError)
    expect(from).not.toHaveBeenCalled()
  })

  it('maps a member-readable trip and its stops through the adapter', async () => {
    const tripId = '10000000-0000-4000-8000-000000000001'
    const stopId = '10000000-0000-4000-8000-000000000002'
    const client = { auth: {}, from: vi.fn((table: string) => {
      if (table === 'trips') return request({ data: { id: tripId, name: 'Lisbon', reference_currency: 'EUR', created_at: '2026-08-04T10:00:00.000Z' }, error: null })
      if (table === 'trip_members') return request({ data: [{ account_id: '10000000-0000-4000-8000-000000000003', role: 'owner' }], error: null })
      if (table === 'trip_travelers') return request({ data: [], error: null })
      if (table === 'stops') return request({ data: [{ id: stopId, trip_id: tripId, name: 'Lisbon', country_code: 'PT', timezone: 'Europe/Lisbon', local_start: '2026-09-04', local_end: '2026-09-05' }], error: null })
      return request({ data: [{ id: stopId, trip_id: tripId, name: 'Lisbon', country_code: 'PT', timezone: 'Europe/Lisbon', local_start: '2026-09-04', local_end: '2026-09-05' }], error: null })
    }) } as unknown as SupabaseClientLike
    const trips = createSupabaseTripsModule(client)
    await expect(trips.get(tripId as Trip['id'])).resolves.toMatchObject({ id: tripId, members: [{ role: 'owner' }] })
    await expect(trips.listStops(tripId as Trip['id'])).resolves.toMatchObject([{ id: stopId, timeZone: 'Europe/Lisbon' }])
  })

  it('surfaces an RLS denial when a non-owner adds a member', async () => {
    const client = { auth: {}, from: vi.fn(() => request({ data: null, error: { code: '42501', message: 'permission denied' } })) } as unknown as SupabaseClientLike
    const trips = createSupabaseTripsModule(client)
    await expect(trips.addMember('10000000-0000-4000-8000-000000000001' as Trip['id'], { accountId: '10000000-0000-4000-8000-000000000003' as Trip['id'] })).rejects.toThrow('not allowed')
  })

  it('validates local date ranges and IANA time zones before writing', async () => {
    const from = vi.fn(() => request({ data: null, error: null }))
    const client = { from, auth: { getUser: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn() } } as unknown as SupabaseClientLike
    const trips = createSupabaseTripsModule(client)
    await expect(trips.createStop({ tripId: '10000000-0000-4000-8000-000000000001' as Stop['tripId'], name: 'Lisbon', countryCode: 'PT', timeZone: 'Europe/Lisbon' as Stop['timeZone'], startDate: '2026-09-06', endDate: '2026-09-05' })).rejects.toThrow('Invalid stop')
    expect(from).not.toHaveBeenCalled()
  })
})

describe('TRP-001 Supabase identity adapter', () => {
  it('maps authenticated accounts and forwards display name at sign-up', async () => {
    const signUp = vi.fn(async () => ({ data: { user: { id: '10000000-0000-4000-8000-000000000003', email: 'second@example.test' } }, error: null }))
    const client = { auth: { getUser: vi.fn(), signInWithPassword: vi.fn(), signUp, signOut: vi.fn() }, from: vi.fn() } as unknown as SupabaseClientLike
    const identity = createSupabaseIdentityModule(client)
    await expect(identity.signUp({ email: 'second@example.test', password: 'not-a-secret', displayName: 'Second adult' })).resolves.toEqual({ id: '10000000-0000-4000-8000-000000000003', email: 'second@example.test' })
    expect(signUp).toHaveBeenCalledWith({ email: 'second@example.test', password: 'not-a-secret', options: { data: { display_name: 'Second adult' } } })
  })
})

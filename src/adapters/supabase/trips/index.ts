import { assertStableId, isIanaTimeZone, isLocalDate, parseStop, parseTrip } from '../../../modules/_shared/validation'
import type { Stop, Trip, TripMember, UUID } from '../../../modules/_shared/model'
import { AuthorizationError, OfflineMutationError } from '../../../modules/trips'
import type { AddTripMemberInput, CreateTripInput, TripsModule, UpdateTripInput } from '../../../modules/trips/interface'
import type { SupabaseClientLike, SupabaseQuery } from '../identity/client'

type Row = Record<string, unknown>
const authErrorCodes = new Set(['42501', 'PGRST301', 'PGRST116'])
const asRows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((row): row is Row => Boolean(row) && typeof row === 'object') : []
const asRow = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
const stringField = (row: Row, key: string): string => { const value = row[key]; if (typeof value !== 'string') throw new Error(`Invalid Supabase field: ${key}`); return value }
const mutationGuard = (isOnline: () => boolean): void => { if (!isOnline()) throw new OfflineMutationError() }
const throwDatabaseError = (error: { message: string; code?: string } | null): void => { if (!error) return; if (error.code && authErrorCodes.has(error.code)) throw new AuthorizationError(); throw new Error(error.message) }
const query = async <T>(request: SupabaseQuery<T>): Promise<T | null> => { const { data, error } = await request; throwDatabaseError(error); return data }

const mapMember = (row: Row): TripMember => ({ accountId: assertStableId(stringField(row, 'account_id')), role: row.role === 'owner' ? 'owner' : 'editor' })
const mapStop = (row: Row): Stop => parseStop({ id: stringField(row, 'id'), tripId: stringField(row, 'trip_id'), name: stringField(row, 'name'), countryCode: stringField(row, 'country_code'), timeZone: stringField(row, 'timezone'), startDate: stringField(row, 'local_start'), endDate: stringField(row, 'local_end') })

export const createSupabaseTripsModule = (client: SupabaseClientLike, isOnline: () => boolean = () => true): TripsModule => {
  const getMembers = async (tripId: UUID) => asRows(await query(client.from('trip_members').select('account_id,role').eq('trip_id', tripId))).map(mapMember)
  const getTravelers = async (tripId: UUID) => asRows(await query(client.from('trip_travelers').select('traveler_id').eq('trip_id', tripId))).map((row) => assertStableId(stringField(row, 'traveler_id')))
  const getStopIds = async (tripId: UUID) => asRows(await query(client.from('stops').select('id').eq('trip_id', tripId).order('sort_order', { ascending: true }))).map((row) => assertStableId(stringField(row, 'id')))
  const mapTrip = async (row: Row): Promise<Trip> => { const id = assertStableId(stringField(row, 'id')); return parseTrip({ id, name: stringField(row, 'name'), referenceCurrency: stringField(row, 'reference_currency'), startsOn: row.starts_on ?? undefined, endsOn: row.ends_on ?? undefined, travelers: await getTravelers(id), members: await getMembers(id), stopIds: await getStopIds(id), createdAt: stringField(row, 'created_at') }) }
  const get = async (tripId: UUID) => { const data = await query(client.from('trips').select('id,name,reference_currency,starts_on,ends_on,created_at').eq('id', tripId).single()); return data ? mapTrip(asRow(data)) : null }

  return {
    async list() { const data = await query(client.from('trips').select('id,name,reference_currency,starts_on,ends_on,created_at').order('created_at', { ascending: false })); return Promise.all(asRows(data).map(mapTrip)) },
    get,
    async create(input: CreateTripInput) {
      mutationGuard(isOnline)
      if (!input.name.trim()) throw new Error('Trip name is required')
      if ((input.startsOn !== undefined && !isLocalDate(input.startsOn)) || (input.endsOn !== undefined && !isLocalDate(input.endsOn)) || (input.startsOn !== undefined && input.endsOn !== undefined && input.startsOn > input.endsOn)) throw new Error('Invalid trip dates')
      const id = assertStableId(crypto.randomUUID())
      const user = await client.auth.getUser()
      throwDatabaseError(user.error)
      if (!user.data?.user) throw new AuthorizationError('An authenticated account is required to create a trip')
      const created = await query(client.from('trips').insert({ id, owner_account_id: user.data.user.id, name: input.name.trim(), reference_currency: input.referenceCurrency, starts_on: input.startsOn, ends_on: input.endsOn }).select('id,name,reference_currency,starts_on,ends_on,created_at').single())
      if (!created) throw new Error('Supabase did not return the created trip')
      if (input.travelerIds?.length) await query(client.from('trip_travelers').insert(input.travelerIds.map((travelerId) => ({ trip_id: id, traveler_id: travelerId }))))
      const result = await get(id); if (!result) throw new Error('Created trip is not readable by the current account'); return result
    },
    async update(tripId: UUID, input: UpdateTripInput) {
      mutationGuard(isOnline)
      if ((input.startsOn !== undefined && !isLocalDate(input.startsOn)) || (input.endsOn !== undefined && !isLocalDate(input.endsOn)) || (input.startsOn !== undefined && input.endsOn !== undefined && input.startsOn > input.endsOn)) throw new Error('Invalid trip dates')
      const data = await query(client.from('trips').update({ ...(input.name === undefined ? {} : { name: input.name.trim() }), ...(input.referenceCurrency === undefined ? {} : { reference_currency: input.referenceCurrency }), ...(input.startsOn === undefined ? {} : { starts_on: input.startsOn }), ...(input.endsOn === undefined ? {} : { ends_on: input.endsOn }) }).eq('id', tripId).select('id,name,reference_currency,starts_on,ends_on,created_at').single())
      if (!data) throw new Error('Trip update returned no row'); return mapTrip(asRow(data))
    },
    async addMember(tripId: UUID, input: AddTripMemberInput) { mutationGuard(isOnline); const { error } = await client.from('trip_members').insert({ trip_id: tripId, account_id: input.accountId, role: input.role ?? 'editor' }); throwDatabaseError(error) },
    async listStops(tripId: UUID) { const data = await query(client.from('stops').select('id,trip_id,name,country_code,timezone,local_start,local_end').eq('trip_id', tripId).order('sort_order', { ascending: true })); return asRows(data).map(mapStop) },
    async createStop(input: Omit<Stop, 'id'>) {
      mutationGuard(isOnline)
      if (!input.name.trim() || !/^[A-Z]{2}$/.test(input.countryCode) || !isLocalDate(input.startDate) || !isLocalDate(input.endDate) || input.startDate > input.endDate || !isIanaTimeZone(input.timeZone)) throw new Error('Invalid stop name, country, dates or timezone')
      const id = assertStableId(crypto.randomUUID())
      const data = await query(client.from('stops').insert({ id, trip_id: input.tripId, name: input.name.trim(), country_code: input.countryCode, timezone: input.timeZone, local_start: input.startDate, local_end: input.endDate }).select('id,trip_id,name,country_code,timezone,local_start,local_end').single())
      if (!data) throw new Error('Supabase did not return the created stop'); return mapStop(asRow(data))
    },
  }
}

export type { SupabaseClientLike } from '../identity/client'

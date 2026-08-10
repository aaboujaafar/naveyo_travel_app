import { AuthorizationError } from '../../../modules/trips'
import type { ISODateTime, UUID } from '../../../modules/_shared/model'
import type { DocumentBody, DocumentStorage, DocumentsModule, DocumentsStore, DownloadedDocumentFile } from '../../../modules/documents'
import { Documents } from '../../../modules/documents/module'
import type { SupabaseClientLike, SupabaseQuery } from '../identity/client'

type Row = Record<string, unknown>
type DatabaseError = { message: string; code?: string }

export interface SupabaseStorageObjectApi {
  upload(path: string, body: DocumentBody, options: { contentType: string; upsert: false }): Promise<{ data: { path: string } | null; error: DatabaseError | null }>
  download(path: string): Promise<{ data: Blob | null; error: DatabaseError | null }>
  remove(paths: string[]): Promise<{ data: unknown; error: DatabaseError | null }>
}

export interface SupabaseStorageClientLike {
  from(bucket: string): SupabaseStorageObjectApi
}

export interface SupabaseDocumentsClientLike extends SupabaseClientLike {
  storage: SupabaseStorageClientLike
}

export type PersistDownloadedDocument = (input: { data: Blob; storagePath: string; fileName?: string }) => Promise<string>

const authErrorCodes = new Set(['42501', 'PGRST301', 'PGRST116'])
const asRows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((row): row is Row => Boolean(row) && typeof row === 'object') : []
const text = (row: Row, key: string): string => {
  const value = row[key]
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Invalid Supabase field: ${key}`)
  return value
}
const number = (row: Row, key: string): number => {
  const value = row[key]
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error(`Invalid Supabase field: ${key}`)
  return value
}
const throwDatabaseError = (error: DatabaseError | null): void => {
  if (!error) return
  if (error.code && authErrorCodes.has(error.code)) throw new AuthorizationError()
  throw new Error(error.message)
}
const query = async <T>(request: SupabaseQuery<T>): Promise<T | null> => {
  const response = await request
  throwDatabaseError(response.error)
  return response.data
}

const mapDocument = (row: Row) => {
  const storagePath = text(row, 'storage_path')
  const pathFileName = storagePath.split('/').at(-1) ?? ''
  const pathKind = pathFileName.split('-', 1)[0] ?? ''
  const kind = ['pdf', 'image', 'text', 'url', 'ics'].includes(pathKind)
    ? pathKind
    : text(row, 'mime_type') === 'application/pdf' ? 'pdf'
      : text(row, 'mime_type') === 'text/calendar' ? 'ics'
        : text(row, 'mime_type').startsWith('image/') ? 'image' : 'text'
  return {
    id: text(row, 'id') as UUID,
    tripId: text(row, 'trip_id') as UUID,
    kind: kind as 'pdf' | 'image' | 'text' | 'url' | 'ics',
    fileName: typeof row.original_filename === 'string' ? row.original_filename : undefined,
    mimeType: text(row, 'mime_type'),
    byteSize: number(row, 'byte_size'),
    storagePath,
    persistentUri: `supabase://trip-documents/${storagePath}`,
    checksum: typeof row.checksum === 'string' ? row.checksum : '',
    stopId: typeof row.stop_id === 'string' ? row.stop_id as UUID : undefined,
    reservationId: typeof row.reservation_id === 'string' ? row.reservation_id as UUID : undefined,
    createdAt: text(row, 'created_at') as ISODateTime,
  }
}

const documentColumns = 'id,trip_id,stop_id,reservation_id,storage_path,mime_type,byte_size,checksum,original_filename,created_at'

const createStore = (client: SupabaseDocumentsClientLike): DocumentsStore => ({
  async list(tripId, stopId) {
    let request = client.from('travel_documents').select(documentColumns).eq('trip_id', tripId)
    if (stopId !== undefined) request = request.eq('stop_id', stopId)
    const data = await query(request.order('created_at', { ascending: false }))
    return asRows(data).map(mapDocument)
  },
  async listUnclassified(tripId) {
    const request = client.from('travel_documents').select(documentColumns).eq('trip_id', tripId)
    if (!request.is) throw new Error('Supabase null filtering is unavailable')
    const data = await query(request.is('stop_id', null).order('created_at', { ascending: false }))
    return asRows(data).map(mapDocument)
  },
  async get(tripId, documentId) {
    const data = await query(client.from('travel_documents').select(documentColumns).eq('trip_id', tripId).eq('id', documentId))
    const row = asRows(data)[0]
    return row === undefined ? null : mapDocument(row)
  },
  async save(document) {
    const data = await query(client.from('travel_documents').insert({
      id: document.id,
      trip_id: document.tripId,
      stop_id: document.stopId ?? null,
      reservation_id: document.reservationId ?? null,
      storage_path: document.storagePath,
      mime_type: document.mimeType,
      byte_size: document.byteSize,
      checksum: document.checksum,
      original_filename: document.fileName ?? null,
    }).select(documentColumns).single())
    if (!data) throw new Error('Supabase did not return the saved document')
  },
  async update(document) {
    const data = await query(client.from('travel_documents').update({ stop_id: document.stopId ?? null }).eq('trip_id', document.tripId).eq('id', document.id).select(documentColumns).single())
    if (!data) throw new Error('Supabase did not return the updated document')
    return mapDocument(asRows([data])[0] ?? {})
  },
  async remove(tripId, documentId) {
    const table = client.from('travel_documents')
    if (!table.delete) throw new Error('Supabase document removal is unavailable')
    const result = table.delete().eq('trip_id', tripId).eq('id', documentId)
    await query(result)
  },
  async hasStop(tripId, stopId) {
    const data = await query(client.from('stops').select('id').eq('trip_id', tripId).eq('id', stopId).single())
    return data !== null
  },
})

const createStorage = (client: SupabaseDocumentsClientLike, persist: PersistDownloadedDocument): DocumentStorage => {
  const bucket = client.storage.from('trip-documents')
  return {
    async upload(input) {
      const result = await bucket.upload(input.storagePath, input.body, { contentType: input.mimeType, upsert: false })
      throwDatabaseError(result.error)
      if (!result.data) throw new Error('Supabase did not return the uploaded document path')
      return { storagePath: result.data.path, persistentUri: `supabase://trip-documents/${result.data.path}`, checksum: input.checksum, byteSize: input.byteSize }
    },
    async download(storagePath, fileName): Promise<DownloadedDocumentFile> {
      const result = await bucket.download(storagePath)
      throwDatabaseError(result.error)
      if (!result.data) throw new Error('Supabase did not return the document')
      return { persistentUri: await persist({ data: result.data, storagePath, fileName }) }
    },
    async remove(storagePath) {
      const result = await bucket.remove([storagePath])
      throwDatabaseError(result.error)
    },
  }
}

export const createSupabaseDocumentsModule = (
  client: SupabaseDocumentsClientLike,
  persistDownloadedDocument: PersistDownloadedDocument,
): DocumentsModule => {
  const store = createStore(client)
  const storage = createStorage(client, persistDownloadedDocument)
  return new Documents(store, storage)
}

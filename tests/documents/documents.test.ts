import { describe, expect, it, vi } from 'vitest'
import { createSupabaseDocumentsModule, type SupabaseDocumentsClientLike } from '../../src/adapters/supabase/documents'
import type { SupabaseQuery, SupabaseResponse } from '../../src/adapters/supabase/identity'
import { Documents } from '../../src/modules/documents/module'
import type { DocumentBody, DocumentStorage, DocumentsStore } from '../../src/modules/documents'
import type { ISODateTime, TravelDocument, UUID } from '../../src/modules/_shared/model'

const tripId = '10000000-0000-4000-8000-000000000001' as UUID
const documentId = '20000000-0000-4000-8000-000000000002' as UUID
const request = <T>(response: SupabaseResponse<T>): SupabaseQuery<T> => ({
  then: (resolve) => Promise.resolve(response).then(resolve),
  select: () => request(response), insert: () => request(response), update: () => request(response), eq: () => request(response), order: () => request(response), single: () => request(response),
})

const input = (body: DocumentBody = new Uint8Array([1, 2, 3])) => ({
  tripId,
  kind: 'pdf' as const,
  fileName: 'boarding pass.pdf',
  mimeType: 'application/pdf',
  byteSize: 3,
  checksum: 'sha256:fixture',
  body,
})

class FakeStore implements DocumentsStore {
  documents: TravelDocument[] = []
  failSave = false
  async list(id: UUID) { return this.documents.filter((document) => document.tripId === id) }
  async get(trip: UUID, id: UUID) { return this.documents.find((document) => document.tripId === trip && document.id === id) ?? null }
  async save(document: TravelDocument) { if (this.failSave) throw new Error('metadata unavailable'); this.documents.push(document) }
}

class FakeStorage implements DocumentStorage {
  removed: string[] = []
  async upload(input: Parameters<DocumentStorage['upload']>[0]) { return { storagePath: input.storagePath, persistentUri: `file:///persistent/${input.storagePath}`, checksum: input.checksum, byteSize: input.byteSize } }
  async download() { return { persistentUri: 'file:///persistent/boarding-pass.pdf' } }
  async remove(path: string) { this.removed.push(path) }
}

describe('DOC-001 documents module', () => {
  it('stores metadata only after the private file upload succeeds', async () => {
    const store = new FakeStore()
    const storage = new FakeStorage()
    const module = new Documents(store, storage)
    const document = await module.add(input())
    expect(document.storagePath).toContain(`${tripId}/${document.id}/pdf-`)
    expect(document.persistentUri).toMatch(/^file:\/\//)
    expect(store.documents).toHaveLength(1)
  })

  it('removes an uploaded file if metadata persistence fails', async () => {
    const store = new FakeStore()
    store.failSave = true
    const storage = new FakeStorage()
    await expect(new Documents(store, storage).add(input())).rejects.toThrow('metadata unavailable')
    expect(storage.removed).toHaveLength(1)
  })

  it('does not expose a document from another trip', async () => {
    const store = new FakeStore()
    store.documents = [{ id: documentId, tripId, kind: 'pdf', storagePath: `${tripId}/${documentId}/pdf-pass.pdf`, persistentUri: 'supabase://trip-documents/private', checksum: 'sha256:x', createdAt: '2026-08-06T10:00:00.000Z' as ISODateTime }]
    await expect(new Documents(store, new FakeStorage()).download('30000000-0000-4000-8000-000000000003' as UUID, documentId)).rejects.toThrow('not available')
  })

  it('rejects unsupported or oversized documents before touching storage', async () => {
    const storage = new FakeStorage()
    const upload = vi.spyOn(storage, 'upload')
    await expect(new Documents(new FakeStore(), storage).add({ ...input(), mimeType: 'application/octet-stream' })).rejects.toThrow('mime type')
    await expect(new Documents(new FakeStore(), storage).add({ ...input(), byteSize: 25 * 1024 * 1024 + 1 })).rejects.toThrow('size')
    expect(upload).not.toHaveBeenCalled()
  })
})

describe('DOC-001 Supabase private storage adapter', () => {
  const row = { id: documentId, trip_id: tripId, reservation_id: null, storage_path: `${tripId}/${documentId}/pdf-pass.pdf`, mime_type: 'application/pdf', byte_size: 3, checksum: 'sha256:fixture', original_filename: 'pass.pdf', created_at: '2026-08-06T10:00:00.000Z' }

  it('maps member metadata and downloads through storage without signed or public URLs', async () => {
    const download = vi.fn(async () => ({ data: new Blob(['pdf']), error: null }))
    const persist = vi.fn(async () => 'file:///persistent/pass.pdf')
    const client = {
      auth: {},
      from: vi.fn((table: string) => table === 'travel_documents' ? request({ data: [row], error: null }) : request({ data: null, error: null })),
      storage: { from: vi.fn(() => ({ upload: vi.fn(), download, remove: vi.fn() })) },
    } as unknown as SupabaseDocumentsClientLike
    const module = createSupabaseDocumentsModule(client, persist)
    await expect(module.list(tripId)).resolves.toMatchObject([{ id: documentId, kind: 'pdf', storagePath: row.storage_path }])
    await expect(module.download(tripId, documentId)).resolves.toEqual({ persistentUri: 'file:///persistent/pass.pdf' })
    expect(download).toHaveBeenCalledWith(row.storage_path)
    expect(persist).toHaveBeenCalledWith({ data: expect.any(Blob), storagePath: row.storage_path, fileName: row.original_filename })
  })

  it('surfaces an RLS denial while listing another member’s trip', async () => {
    const from = vi.fn(() => request({ data: null, error: { code: '42501', message: 'permission denied' } }))
    const client = { auth: {}, from, storage: { from: vi.fn() } } as unknown as Parameters<typeof createSupabaseDocumentsModule>[0]
    await expect(createSupabaseDocumentsModule(client, async () => 'file:///unused').list(tripId)).rejects.toThrow('not allowed')
  })

  it('surfaces an RLS denial during private upload and never writes metadata', async () => {
    const from = vi.fn()
    const upload = vi.fn(async () => ({ data: null, error: { code: '42501', message: 'permission denied' } }))
    const client = { auth: {}, from, storage: { from: vi.fn(() => ({ upload, download: vi.fn(), remove: vi.fn() })) } } as unknown as Parameters<typeof createSupabaseDocumentsModule>[0]
    await expect(createSupabaseDocumentsModule(client, async () => 'file:///unused').add(input())).rejects.toThrow('not allowed')
    expect(from).not.toHaveBeenCalled()
  })
})

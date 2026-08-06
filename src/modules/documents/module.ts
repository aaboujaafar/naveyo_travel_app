import { AuthorizationError } from '../trips'
import { isUuid } from '../_shared/validation'
import type { ISODateTime, UUID } from '../_shared/model'
import type { AddDocumentInput, DocumentStorage, DocumentsModule, DocumentsStore, DownloadedDocumentFile } from './interface'
import { documentMimeTypes } from './model'

const maxDocumentBytes = 25 * 1024 * 1024
const allowedKinds = new Set(Object.keys(documentMimeTypes))

const assertTripId = (tripId: UUID): void => {
  if (!isUuid(tripId)) throw new Error('Invalid trip id')
}

const makeId = (): UUID => {
  const id = globalThis.crypto?.randomUUID?.()
  if (id !== undefined && isUuid(id)) return id
  return '00000000-0000-4000-8000-000000000001' as UUID
}

const safeFileName = (fileName: string | undefined): string => {
  const normalized = fileName?.trim().replace(/[^a-zA-Z0-9._-]/g, '_')
  return normalized && normalized.length > 0 ? normalized.slice(0, 160) : 'document'
}

export class Documents implements DocumentsModule {
  constructor(
    private readonly store: DocumentsStore,
    private readonly storage: DocumentStorage,
  ) {}

  async list(tripId: UUID) {
    assertTripId(tripId)
    return this.store.list(tripId)
  }

  async add(input: AddDocumentInput) {
    this.assertInput(input)
    const documentId = makeId()
    const storagePath = `${input.tripId}/${documentId}/${input.kind}-${safeFileName(input.fileName)}`
    const stored = await this.storage.upload({
      storagePath,
      body: input.body,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      checksum: input.checksum,
    })
    const document = {
      id: documentId,
      tripId: input.tripId,
      kind: input.kind,
      fileName: input.fileName?.trim() || undefined,
      mimeType: input.mimeType,
      byteSize: stored.byteSize,
      storagePath: stored.storagePath,
      persistentUri: stored.persistentUri,
      checksum: stored.checksum,
      reservationId: input.reservationId,
      createdAt: new Date().toISOString() as ISODateTime,
    }
    try {
      await this.store.save(document)
      return document
    } catch (error) {
      try { await this.storage.remove(stored.storagePath) } catch { /* preserve the metadata error */ }
      throw error
    }
  }

  async download(tripId: UUID, documentId: UUID): Promise<DownloadedDocumentFile> {
    assertTripId(tripId)
    if (!isUuid(documentId)) throw new Error('Invalid document id')
    const document = await this.store.get(tripId, documentId)
    if (document === null) throw new AuthorizationError('Document is not available for this trip')
    if (document.storagePath === undefined) throw new Error('Document has no private storage path')
    return this.storage.download(document.storagePath, document.fileName)
  }

  private assertInput(input: AddDocumentInput): void {
    assertTripId(input.tripId)
    if (!allowedKinds.has(input.kind)) throw new Error('Invalid document kind')
    if (input.mimeType !== documentMimeTypes[input.kind]) throw new Error('Invalid document mime type')
    if (!Number.isSafeInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize > maxDocumentBytes) throw new Error('Invalid document size')
    if (!input.checksum.trim()) throw new Error('Document checksum is required')
    if (input.reservationId !== undefined && !isUuid(input.reservationId)) throw new Error('Invalid reservation id')
  }
}

export { maxDocumentBytes }

import type { DocumentKind, TravelDocument, UUID } from "../_shared/model";

export type DocumentBody = Blob | ArrayBuffer | Uint8Array | string;

export interface AddDocumentInput {
  tripId: UUID;
  kind: DocumentKind;
  fileName?: string;
  reservationId?: UUID;
  mimeType: string;
  byteSize: number;
  checksum: string;
  body: DocumentBody;
}

export interface StoredDocumentFile {
  storagePath: string;
  persistentUri: string;
  checksum: string;
  byteSize: number;
}

export interface DownloadedDocumentFile {
  persistentUri: string;
}

export interface DocumentStorage {
  upload(input: { storagePath: string; body: DocumentBody; mimeType: string; byteSize: number; checksum: string }): Promise<StoredDocumentFile>;
  download(storagePath: string, fileName?: string): Promise<DownloadedDocumentFile>;
  remove(storagePath: string): Promise<void>;
}

export interface DocumentsStore {
  list(tripId: UUID): Promise<TravelDocument[]>;
  get(tripId: UUID, documentId: UUID): Promise<TravelDocument | null>;
  save(document: TravelDocument): Promise<void>;
}

export interface DocumentsModule {
  list(tripId: UUID): Promise<TravelDocument[]>;
  add(input: AddDocumentInput): Promise<TravelDocument>;
  download(tripId: UUID, documentId: UUID): Promise<DownloadedDocumentFile>;
}

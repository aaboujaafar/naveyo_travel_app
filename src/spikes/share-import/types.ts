export type ShareSourceApp = 'mail' | 'safari' | 'photos' | 'travel-app'

export type SharePayloadKind = 'pdf' | 'image' | 'text' | 'url'

export type ShareImportState = 'staged' | 'restored' | 'missing'

export interface ShareFilePayload {
  kind: 'pdf' | 'image'
  tempUri: string
  fileName: string
  mimeType?: string
}

export interface ShareTextPayload {
  kind: 'text'
  text: string
}

export interface ShareUrlPayload {
  kind: 'url'
  url: string
  title?: string
}

export type SharePayload = ShareFilePayload | ShareTextPayload | ShareUrlPayload

export interface ShareImportInput {
  sourceApp: ShareSourceApp
  payload: SharePayload
  receivedAt: string
}

export interface ShareImportRecord {
  id: string
  sourceApp: ShareSourceApp
  payloadKind: SharePayloadKind
  state: ShareImportState
  createdAt: string
  persistedAt: string
  payloadUri: string
  metadata: {
    fileName?: string
    mimeType?: string
    title?: string
    text?: string
    url?: string
  }
}

export interface ShareImportManifest {
  id: string
  sourceApp: ShareSourceApp
  payloadKind: SharePayloadKind
  state: ShareImportState
  createdAt: string
  persistedAt: string
  payloadUri: string
  metadata: {
    fileName?: string
    mimeType?: string
    title?: string
    text?: string
    url?: string
  }
}

export interface ShareImportVault {
  stage(input: ShareImportInput): Promise<ShareImportRecord>
  resume(id: string): Promise<ShareImportRecord | null>
  list(): Promise<ShareImportRecord[]>
}

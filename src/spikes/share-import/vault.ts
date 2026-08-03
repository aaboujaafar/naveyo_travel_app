/// <reference path="./node-shims.d.ts" />

import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import type {
  ShareImportManifest,
  ShareImportRecord,
  ShareImportVault,
  SharePayload,
  SharePayloadKind,
} from './types'

const manifestFileName = 'manifest.json'

const ensureDir = async (target: string) => {
  await mkdir(target, { recursive: true })
}

const safeFileName = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'payload'

const payloadExtension = (kind: SharePayloadKind, fileName?: string) => {
  if (kind === 'text') return 'txt'
  if (kind === 'url') return 'url'
  const extension = path.extname(fileName ?? '').replace(/^\./, '')
  return extension || (kind === 'pdf' ? 'pdf' : 'img')
}

const serializePayload = async (targetPath: string, payload: SharePayload) => {
  switch (payload.kind) {
    case 'pdf':
    case 'image':
      await copyFile(payload.tempUri, targetPath)
      return
    case 'text':
      await writeFile(targetPath, payload.text, 'utf8')
      return
    case 'url':
      await writeFile(targetPath, `${payload.url}\n`, 'utf8')
  }
}

const buildRecord = (manifest: ShareImportManifest): ShareImportRecord => ({
  id: manifest.id,
  sourceApp: manifest.sourceApp,
  payloadKind: manifest.payloadKind,
  state: manifest.state,
  createdAt: manifest.createdAt,
  persistedAt: manifest.persistedAt,
  payloadUri: manifest.payloadUri,
  metadata: manifest.metadata,
})

const readManifest = async (manifestPath: string) => {
  const manifestJson = await readFile(manifestPath, 'utf8')
  return JSON.parse(manifestJson) as ShareImportManifest
}

const manifestPathFor = (rootDir: string, id: string) => path.join(rootDir, 'imports', id, manifestFileName)

export const createShareImportVault = (rootDir: string): ShareImportVault => ({
  async stage(input) {
    const id = randomUUID()
    const createdAt = input.receivedAt
    const persistedAt = new Date().toISOString()
    const importDir = path.join(rootDir, 'imports', id)
    await ensureDir(importDir)

    const payload = input.payload
    const kind = payload.kind
    const payloadFileName =
      kind === 'pdf' || kind === 'image'
        ? `${safeFileName(payload.fileName || 'payload')}.${payloadExtension(kind, payload.fileName)}`
        : `payload.${payloadExtension(kind)}`

    const payloadUri = path.join(importDir, payloadFileName)
    await serializePayload(payloadUri, payload)

    let metadata: ShareImportManifest['metadata']
    switch (kind) {
      case 'pdf':
      case 'image':
        metadata = {
          fileName: payload.fileName,
          mimeType: payload.mimeType,
        }
        break
      case 'text':
        metadata = { text: payload.text }
        break
      case 'url':
        metadata = { title: payload.title, url: payload.url }
        break
    }

    const manifest: ShareImportManifest = {
      id,
      sourceApp: input.sourceApp,
      payloadKind: kind,
      state: 'staged',
      createdAt,
      persistedAt,
      payloadUri,
      metadata,
    }

    await writeFile(path.join(importDir, manifestFileName), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    return buildRecord(manifest)
  },

  async resume(id) {
    try {
      const manifest = await readManifest(manifestPathFor(rootDir, id))
      await stat(manifest.payloadUri)
      return buildRecord({ ...manifest, state: 'restored' })
    } catch {
      return null
    }
  },

  async list() {
    const importsDir = path.join(rootDir, 'imports')
    await ensureDir(importsDir)
    const entries = await readdir(importsDir, { withFileTypes: true })
    const records: ShareImportRecord[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const manifestPath = path.join(importsDir, entry.name, manifestFileName)
      try {
        const manifest = await readManifest(manifestPath)
        records.push(buildRecord(manifest))
      } catch {
        continue
      }
    }

    return records.sort((left, right) => left.createdAt.localeCompare(right.createdAt))
  },
})

export const shareImportPaths = {
  manifestPathFor,
}

/// <reference path="./node-shims.d.ts" />

import { mkdtemp, readFile, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { createShareImportVault } from './vault'

const createTempDir = async () => mkdtemp(path.join(os.tmpdir(), 'naveyo-share-import-'))

describe('share import vault', () => {
  it('copies file payloads out of the temporary URI and restores them after relaunch', async () => {
    const sourceRoot = await createTempDir()
    const durableRoot = await createTempDir()
    const tempFile = path.join(sourceRoot, 'boarding-pass.pdf')
    await writeFile(tempFile, 'fake pdf payload', 'utf8')

    const vault = createShareImportVault(durableRoot)
    const staged = await vault.stage({
      sourceApp: 'mail',
      receivedAt: '2026-07-29T09:00:00.000Z',
      payload: {
        kind: 'pdf',
        tempUri: tempFile,
        fileName: 'boarding-pass.pdf',
        mimeType: 'application/pdf',
      },
    })

    const manifestJson = await readFile(path.join(durableRoot, 'imports', staged.id, 'manifest.json'), 'utf8')
    expect(manifestJson).not.toContain(tempFile)
    expect(manifestJson).toContain('"state": "staged"')
    expect(await readFile(staged.payloadUri, 'utf8')).toBe('fake pdf payload')

    const reloadedVault = createShareImportVault(durableRoot)
    await expect(reloadedVault.resume(staged.id)).resolves.toMatchObject({
      id: staged.id,
      state: 'restored',
      sourceApp: 'mail',
      payloadKind: 'pdf',
    })
  })

  it('persists text and url shares durably without needing the original source URI', async () => {
    const durableRoot = await createTempDir()
    const vault = createShareImportVault(durableRoot)

    const textImport = await vault.stage({
      sourceApp: 'safari',
      receivedAt: '2026-07-29T09:01:00.000Z',
      payload: {
        kind: 'text',
        text: 'Hotel confirmation for Lisbon',
      },
    })

    const urlImport = await vault.stage({
      sourceApp: 'photos',
      receivedAt: '2026-07-29T09:02:00.000Z',
      payload: {
        kind: 'url',
        url: 'https://example.com/travel/itinerary',
        title: 'Trip itinerary',
      },
    })

    expect(await readFile(textImport.payloadUri, 'utf8')).toBe('Hotel confirmation for Lisbon')
    expect(await readFile(urlImport.payloadUri, 'utf8')).toBe('https://example.com/travel/itinerary\n')
    await expect(vault.list()).resolves.toHaveLength(2)
  })

  it('returns null when the durable payload is missing after relaunch', async () => {
    const durableRoot = await createTempDir()
    const vault = createShareImportVault(durableRoot)

    const staged = await vault.stage({
      sourceApp: 'travel-app',
      receivedAt: '2026-07-29T09:03:00.000Z',
      payload: {
        kind: 'text',
        text: 'Deep link exported from a travel app',
      },
    })

    await expect(vault.resume(staged.id)).resolves.toMatchObject({
      id: staged.id,
      state: 'restored',
    })

    await unlink(staged.payloadUri)
    await expect(vault.resume(staged.id)).resolves.toBeNull()
  })
})

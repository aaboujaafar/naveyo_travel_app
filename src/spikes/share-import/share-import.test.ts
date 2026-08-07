/// <reference path="./node-shims.d.ts" />

import { mkdtemp, readFile, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { createShareImportVault, shareImportLimits } from './vault'

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
    await expect(vault.list()).resolves.toMatchObject([{ id: staged.id, state: 'missing' }])
  })

  it('accepts bounded ICS files and rejects unsafe file MIME types', async () => {
    const sourceRoot = await createTempDir()
    const durableRoot = await createTempDir()
    const tempFile = path.join(sourceRoot, 'booking.ics')
    await writeFile(tempFile, 'BEGIN:VCALENDAR\nEND:VCALENDAR\n', 'utf8')

    const staged = await createShareImportVault(durableRoot).stage({
      sourceApp: 'travel-app',
      receivedAt: '2026-07-29T09:04:00.000Z',
      payload: {
        kind: 'ics',
        tempUri: tempFile,
        fileName: 'booking.ics',
        mimeType: 'text/calendar',
      },
    })

    expect(staged.payloadKind).toBe('ics')
    expect(staged.metadata).toMatchObject({ fileName: 'booking.ics', mimeType: 'text/calendar' })
    expect(await readFile(staged.payloadUri, 'utf8')).toContain('BEGIN:VCALENDAR')

    await expect(
      createShareImportVault(durableRoot).stage({
        sourceApp: 'mail',
        receivedAt: '2026-07-29T09:05:00.000Z',
        payload: {
          kind: 'ics',
          tempUri: tempFile,
          fileName: 'booking.ics',
          mimeType: 'application/pdf',
        },
      }),
    ).rejects.toThrow('ICS payload MIME type')
  })

  it('rejects malformed share input before creating an import directory', async () => {
    const durableRoot = await createTempDir()
    const vault = createShareImportVault(durableRoot)

    await expect(
      vault.stage({
        sourceApp: 'mail',
        receivedAt: 'not-a-date',
        payload: { kind: 'url', url: 'file:///private/booking.pdf' },
      }),
    ).rejects.toThrow('receivedAt')

    await expect(
      vault.stage({
        sourceApp: 'mail',
        receivedAt: '2026-07-29T09:06:00.000Z',
        payload: { kind: 'url', url: 'javascript:alert(1)' },
      }),
    ).rejects.toThrow('HTTP or HTTPS')

    await expect(
      vault.stage({
        sourceApp: 'mail',
        receivedAt: '2026-07-29T09:07:00.000Z',
        payload: { kind: 'text', text: 'x'.repeat(shareImportLimits.maxTextBytes + 1) },
      }),
    ).rejects.toThrow('size limit')

    await expect(vault.list()).resolves.toHaveLength(0)
  })

  it('ignores a manifest whose payload path escapes its import directory', async () => {
    const durableRoot = await createTempDir()
    const vault = createShareImportVault(durableRoot)
    const staged = await vault.stage({
      sourceApp: 'mail',
      receivedAt: '2026-07-29T09:08:00.000Z',
      payload: { kind: 'text', text: 'Confirmation' },
    })
    const manifestPath = path.join(durableRoot, 'imports', staged.id, 'manifest.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>
    manifest.payloadUri = path.join(durableRoot, 'outside.txt')
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, 'utf8')

    await expect(vault.resume(staged.id)).resolves.toBeNull()
    await expect(vault.list()).resolves.toHaveLength(0)
  })
})

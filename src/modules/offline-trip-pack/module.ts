import type { TripPack, TripPackManifest, UUID } from '../_shared/model'
import { parseTripPack, parseTripPackManifest } from '../_shared/validation'
import type { OfflineTripPackModule } from './interface'
import {
  CURRENT_TRIP_PACK_SCHEMA_VERSION,
  type OfflineTripPackLoad,
  type OfflineTripPackStore,
  type TripPackFileStore,
} from './model'

const invalid = (reason: string): never => { throw new Error(`Invalid offline trip pack: ${reason}`) }

export class OfflineTripPack implements OfflineTripPackModule {
  constructor(
    private readonly store: OfflineTripPackStore,
    private readonly files: TripPackFileStore,
  ) {}

  async get(tripId: UUID): Promise<TripPack | null> {
    const result = await this.load(tripId)
    return result.state === 'ready' ? result.pack : null
  }

  async manifest(tripId: UUID): Promise<TripPackManifest | null> {
    const result = await this.load(tripId)
    return result.manifest
  }

  async load(tripId: UUID): Promise<OfflineTripPackLoad> {
    const stored = await this.store.readActive(tripId)
    if (stored === null) return { state: 'empty', pack: null, manifest: null }

    try {
      const pack = parseTripPack(stored.pack)
      if (pack.manifest.schemaVersion !== CURRENT_TRIP_PACK_SCHEMA_VERSION) {
        return { state: 'incompatible', pack: null, manifest: pack.manifest, reason: 'schema-version' }
      }
      await this.assertFilesReady(pack)
      return { state: 'ready', pack, manifest: pack.manifest }
    } catch (error) {
      return {
        state: 'incomplete',
        pack: null,
        manifest: this.readManifest(stored.pack),
        reason: error instanceof Error ? error.message : 'unknown-error',
      }
    }
  }

  async replace(pack: TripPack): Promise<void> {
    const validated = parseTripPack(pack)
    if (validated.manifest.schemaVersion !== CURRENT_TRIP_PACK_SCHEMA_VERSION) invalid('unsupported schema version')
    await this.assertFilesReady(validated)
    await this.store.stage(validated)
    await this.store.activate(validated.manifest.tripId)
  }

  private async assertFilesReady(pack: TripPack): Promise<void> {
    const paths = new Set<string>()
    for (const file of pack.manifest.files) {
      if (paths.has(file.path)) invalid(`duplicate file path ${file.path}`)
      paths.add(file.path)
      if (file.state !== 'ready') invalid(`file is not ready: ${file.path}`)
      const status = await this.files.inspect(file.path)
      if (!status.exists) invalid(`file is missing: ${file.path}`)
      if (status.checksum !== file.checksum) invalid(`checksum mismatch: ${file.path}`)
    }
  }

  private readManifest(value: unknown): TripPackManifest | null {
    try { return parseTripPackManifest((value as { manifest?: unknown }).manifest) } catch { return null }
  }
}

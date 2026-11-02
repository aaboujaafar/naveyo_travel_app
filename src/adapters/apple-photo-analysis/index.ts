import { requireOptionalNativeModule } from "expo";
import type { PhotoAnalysis } from "../../screens/album-photos-model";

/** What PhotoKit and Vision tell about one photo, read off the JavaScript thread. */
export interface AlbumPhotoDetails {
  isFavorite: boolean;
  location?: { latitude: number; longitude: number };
  burstId?: string;
  burstPick?: boolean;
  /** Small local JPEG for display; absent when the photo is only in iCloud. */
  thumbnailUri?: string;
  analysis?: PhotoAnalysis;
}

interface NativeResult {
  id: string;
  isFavorite: boolean;
  latitude?: number;
  longitude?: number;
  burstId?: string;
  burstPick?: boolean;
  thumbnailUri?: string;
  score?: number;
  utility?: boolean;
  similarGroup?: number;
}

interface NativePhotoAnalysis {
  readAlbumPhotos(ids: string[], analyze: boolean, similarity: number): Promise<NativeResult[]>;
}

/** Feature-print distance under which two consecutive photos show the same scene (calibrated: same photo resized 0.2, different scenes above 0.9). */
const SIMILARITY = 0.5;
const BATCH = 24;

export const isPhotoAnalysisAvailable = (): boolean => requireOptionalNativeModule("NaveyoPhotoAnalysis") !== null;

/**
 * Reads the photos (in shooting order) with PhotoKit and, when `analyze` is set,
 * scores and groups them with Vision. Resolves to an empty map on a build
 * without the native module: the selection then works from the dates alone.
 */
export async function readAlbumPhotos(
  ids: readonly string[],
  analyze: boolean,
  onProgress?: (done: number) => void,
): Promise<Map<string, AlbumPhotoDetails>> {
  const native = requireOptionalNativeModule<NativePhotoAnalysis>("NaveyoPhotoAnalysis");
  const details = new Map<string, AlbumPhotoDetails>();
  if (!native) return details;
  let groupOffset = 0;
  for (let index = 0; index < ids.length; index += BATCH) {
    // Batches overlap by one photo so a scene spanning two batches stays one group.
    const start = Math.max(0, index - 1);
    const results = await native.readAlbumPhotos(ids.slice(start, index + BATCH), analyze, SIMILARITY).catch((): NativeResult[] => []);
    const carried = start < index ? details.get(ids[start]!)?.analysis?.similarGroup : undefined;
    const firstGroup = results[0]?.similarGroup;
    let maxGroup = groupOffset;
    for (const [position, result] of results.entries()) {
      if (start < index && position === 0) continue;
      const group = result.similarGroup === undefined
        ? undefined
        : carried !== undefined && result.similarGroup === firstGroup
          ? carried
          : groupOffset + result.similarGroup;
      if (group !== undefined) maxGroup = Math.max(maxGroup, group);
      const analysis: PhotoAnalysis = {
        ...(result.score !== undefined ? { score: result.score } : {}),
        ...(result.utility !== undefined ? { utility: result.utility } : {}),
        ...(group !== undefined ? { similarGroup: group } : {}),
      };
      details.set(result.id, {
        isFavorite: result.isFavorite,
        ...(result.latitude !== undefined && result.longitude !== undefined ? { location: { latitude: result.latitude, longitude: result.longitude } } : {}),
        ...(result.burstId ? { burstId: result.burstId, burstPick: result.burstPick === true } : {}),
        ...(result.thumbnailUri ? { thumbnailUri: result.thumbnailUri } : {}),
        ...(Object.keys(analysis).length > 0 ? { analysis } : {}),
      });
    }
    groupOffset = maxGroup + 1;
    onProgress?.(Math.min(ids.length, index + BATCH));
  }
  return details;
}

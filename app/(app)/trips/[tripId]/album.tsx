import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readAlbumPhotos } from "../../../../src/adapters/apple-photo-analysis";
import { useNaveyoBootstrap } from "../../../../src/bootstrap";
import type { Stop, UUID } from "../../../../src/modules/_shared/model";
import { AlbumPhotosScreen } from "../../../../src/screens/AlbumPhotosScreen";
import { DEFAULT_PHOTOS_PER_DAY, photosDuringTrip, selectAlbumPhotos, type AlbumPhotoInput, type PhotoAnalysis } from "../../../../src/screens/album-photos-model";
import type { PhotoAccess } from "../../../../src/screens/TripStoriesScreen";

const DAY = 86_400_000;
const PAGE = 500;
const MAX_PHOTOS = 5_000;

/** The traveller's choices and the Vision results, kept on the iPhone. */
interface AlbumState {
  perDay: number;
  added: string[];
  removed: string[];
  analyses: Record<string, PhotoAnalysis>;
}
const EMPTY_STATE: AlbumState = { perDay: DEFAULT_PHOTOS_PER_DAY, added: [], removed: [], analyses: {} };
const statePath = (tripId: string) => `${FileSystem.documentDirectory ?? ""}albums/${tripId}.json`;

export default function AlbumRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const tripId = typeof rawTripId === "string" ? (rawTripId as UUID) : undefined;
  const bootstrap = useNaveyoBootstrap();
  const [tripName, setTripName] = useState("Voyage");
  const [stops, setStops] = useState<Stop[] | null>(null);
  const [access, setAccess] = useState<PhotoAccess>("unknown");
  const [photos, setPhotos] = useState<AlbumPhotoInput[] | null>(null);
  const [readCount, setReadCount] = useState(0);
  const [state, setState] = useState<AlbumState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<AlbumState>(EMPTY_STATE);

  const save = useCallback((next: AlbumState) => {
    stateRef.current = next;
    setState(next);
    if (!tripId || !FileSystem.documentDirectory) return;
    void FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}albums/`, { intermediates: true })
      .then(() => FileSystem.writeAsStringAsync(statePath(tripId), JSON.stringify(next)))
      .catch(() => undefined);
  }, [tripId]);

  useEffect(() => {
    if (!bootstrap || !tripId) return;
    let active = true;
    void (async () => {
      const saved = await FileSystem.readAsStringAsync(statePath(tripId)).then((text) => ({ ...EMPTY_STATE, ...(JSON.parse(text) as Partial<AlbumState>) }), () => EMPTY_STATE);
      const [trip, nextStops, permission] = await Promise.all([
        bootstrap.modules.trips.get(tripId).catch(() => null),
        bootstrap.modules.trips.listStops(tripId).catch(async () => (await bootstrap.modules.offlineTripPack.get(tripId).catch(() => null))?.stops ?? []),
        MediaLibrary.getPermissionsAsync(),
      ]);
      if (!active) return;
      stateRef.current = saved;
      setState(saved);
      setTripName(trip?.name ?? "Voyage");
      setStops([...nextStops]);
      setAccess(toAccess(permission));
    })().catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Impossible de charger le Voyage.");
    });
    return () => {
      active = false;
    };
  }, [bootstrap, tripId]);

  // Reads the camera roll over the Voyage dates; PhotoKit and Vision then look at what is left.
  useEffect(() => {
    if (!stops || stops.length === 0 || (access !== "granted" && access !== "limited") || photos !== null) return;
    let active = true;
    void (async () => {
      const first = stops.reduce((min, stop) => (stop.startDate < min ? stop.startDate : min), stops[0]!.startDate);
      const last = stops.reduce((max, stop) => (stop.endDate > max ? stop.endDate : max), stops[0]!.endDate);
      // A day of margin each side: time zones and the journey there and back.
      const createdAfter = Date.parse(`${first}T00:00:00Z`) - DAY;
      const createdBefore = Date.parse(`${last}T00:00:00Z`) + 2 * DAY;
      const assets: MediaLibrary.Asset[] = [];
      let after: string | undefined;
      do {
        const page = await MediaLibrary.getAssetsAsync({ mediaType: MediaLibrary.MediaType.photo, sortBy: [[MediaLibrary.SortBy.creationTime, true]], first: PAGE, createdAfter, createdBefore, ...(after ? { after } : {}) });
        assets.push(...page.assets);
        after = page.hasNextPage ? page.endCursor : undefined;
      } while (after && assets.length < MAX_PHOTOS);

      const base: AlbumPhotoInput[] = assets.map((asset) => ({
        id: asset.id,
        uri: asset.uri,
        takenAt: asset.creationTime,
        width: asset.width,
        height: asset.height,
        ...(asset.mediaSubtypes ? { mediaSubtypes: asset.mediaSubtypes } : {}),
      }));
      // Only photos dated in the Voyage are read further, in shooting order.
      const inTrip = photosDuringTrip(base, stops);
      const known = stateRef.current.analyses;
      // A new photo can change the similarity groups: then the whole Voyage is analysed again.
      const analyze = inTrip.some((photo) => !known[photo.id]);
      const details = await readAlbumPhotos(inTrip.map((photo) => photo.id), analyze, (done) => {
        if (active) setReadCount(done);
      });
      if (analyze && details.size > 0) {
        const analyses = Object.fromEntries([...details].flatMap(([id, detail]) => (detail.analysis ? [[id, detail.analysis]] : [])));
        save({ ...stateRef.current, analyses });
      }
      const read = base.map((photo): AlbumPhotoInput => {
        const detail = details.get(photo.id);
        if (!detail) return photo;
        return {
          ...photo,
          ...(detail.thumbnailUri ? { uri: detail.thumbnailUri } : {}),
          ...(detail.isFavorite ? { isFavorite: true } : {}),
          ...(detail.location ? { location: detail.location } : {}),
          ...(detail.burstId ? { burstId: detail.burstId, burstPick: detail.burstPick } : {}),
        };
      });
      if (active) setPhotos(read);
    })().catch((cause: unknown) => {
      if (active) {
        setPhotos([]);
        setError(cause instanceof Error ? cause.message : "Impossible de lire les photos.");
      }
    });
    return () => {
      active = false;
    };
  }, [access, photos, save, stops]);

  const selection = useMemo(() => {
    if (!photos || !stops || !state) return null;
    const withAnalysis = photos.map((photo) => (state.analyses[photo.id] ? { ...photo, analysis: state.analyses[photo.id] } : photo));
    return selectAlbumPhotos(withAnalysis, stops, { perDay: state.perDay, overrides: { added: state.added, removed: state.removed } });
  }, [photos, state, stops]);

  return (
    <AlbumPhotosScreen
      tripName={tripName}
      access={access}
      selection={selection}
      readCount={readCount}
      perDay={state?.perDay ?? DEFAULT_PHOTOS_PER_DAY}
      error={error ?? (stops && stops.length === 0 ? "Ajoutez une Étape avec ses dates pour retrouver les photos du Voyage." : null)}
      onAskAccess={() => void MediaLibrary.requestPermissionsAsync(false).then((permission) => setAccess(toAccess(permission)))}
      onChangePerDay={(perDay) => save({ ...stateRef.current, perDay })}
      onRemove={(id) => save({ ...stateRef.current, added: stateRef.current.added.filter((item) => item !== id), removed: [...new Set([...stateRef.current.removed, id])] })}
      onAdd={(id) => save({ ...stateRef.current, removed: stateRef.current.removed.filter((item) => item !== id), added: [...new Set([...stateRef.current.added, id])] })}
      onBack={() => router.back()}
    />
  );
}

function toAccess(permission: MediaLibrary.PermissionResponse): PhotoAccess {
  if (permission.granted) return permission.accessPrivileges === "limited" ? "limited" : "granted";
  return permission.canAskAgain ? "unknown" : "denied";
}

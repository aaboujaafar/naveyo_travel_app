import { useLocalSearchParams, useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library/legacy";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Share, type View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useNaveyoBootstrap } from "../../../../src/bootstrap";
import type { ItineraryItem, Reservation, Stop, TrackPoint, Trip, UUID } from "../../../../src/modules/_shared/model";
import type { Expense } from "../../../../src/modules/expenses";
import { TripStoriesScreen, type PhotoAccess } from "../../../../src/screens/TripStoriesScreen";
import { buildTripRecap } from "../../../../src/screens/trip-recap-model";
import { buildStorySlides, buildTripTrace, suggestTripPhotos, type StoryPhoto } from "../../../../src/screens/trip-stories-model";

interface TripData {
  trip: Trip;
  stops: Stop[];
  itinerary: ItineraryItem[];
  reservations: Reservation[];
  expenses: Expense[];
  trackPoints: TrackPoint[];
}

const DAY = 86_400_000;
const MAX_ASSETS = 400;
const CAPTURE = { format: "jpg", quality: 0.92, width: 1080, height: 1920, result: "tmpfile" } as const;

export default function TripStoriesRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const tripId = typeof rawTripId === "string" ? (rawTripId as UUID) : undefined;
  const bootstrap = useNaveyoBootstrap();
  const [data, setData] = useState<TripData | null>(null);
  const [access, setAccess] = useState<PhotoAccess>("unknown");
  const [library, setLibrary] = useState<StoryPhoto[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!bootstrap || !tripId) return;
    const { modules } = bootstrap;
    let active = true;
    const optional = <T,>(promise: Promise<T[]>) => promise.catch(() => [] as T[]);
    void Promise.all([
      modules.trips.get(tripId),
      modules.trips.listStops(tripId),
      optional(modules.itinerary.list(tripId)),
      optional(modules.reservations.list(tripId)),
      optional(modules.expenses.list(tripId)),
      optional(modules.tripTracking.list(tripId)),
    ])
      .then(([trip, stops, itinerary, reservations, expenses, trackPoints]) => {
        if (!active) return;
        if (trip) setData({ trip, stops, itinerary, reservations, expenses, trackPoints });
        else setError("Ce Voyage n’est plus accessible.");
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Impossible de charger le Voyage.");
      });
    void MediaLibrary.getPermissionsAsync().then((permission) => {
      if (active) setAccess(toAccess(permission));
    });
    return () => {
      active = false;
    };
  }, [bootstrap, tripId]);

  const trace = useMemo(() => (data ? buildTripTrace(data) : []), [data]);
  const timeZone = data?.stops[0]?.timeZone ?? "UTC";

  // Reads the camera roll around the Voyage dates once the access is granted.
  useEffect(() => {
    if (!data || (access !== "granted" && access !== "limited") || library !== null) return;
    let active = true;
    void (async () => {
      try {
        const start = data.trip.startsOn ? Date.parse(`${data.trip.startsOn}T00:00:00Z`) - DAY : undefined;
        const end = data.trip.endsOn ? Date.parse(`${data.trip.endsOn}T00:00:00Z`) + 2 * DAY : undefined;
        const page = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: [[MediaLibrary.SortBy.creationTime, true]],
          first: MAX_ASSETS,
          ...(start ? { createdAfter: start } : {}),
          ...(end ? { createdBefore: end } : {}),
        });
        const photos: StoryPhoto[] = [];
        // Locations need one call per photo: small batches keep the UI responsive.
        for (let index = 0; index < page.assets.length; index += 12) {
          const batch = await Promise.all(page.assets.slice(index, index + 12).map(async (asset) => {
            const info = await MediaLibrary.getAssetInfoAsync(asset).catch(() => null);
            return {
              id: asset.id,
              uri: info?.localUri ?? asset.uri,
              takenAt: asset.creationTime,
              ...(info?.location ? { location: { latitude: info.location.latitude, longitude: info.location.longitude } } : {}),
            } satisfies StoryPhoto;
          }));
          photos.push(...batch);
        }
        if (active) setLibrary(photos);
      } catch (cause) {
        if (active) {
          setLibrary([]);
          setError(cause instanceof Error ? cause.message : "Impossible de lire les photos.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [access, data, library]);

  const suggestion = useMemo(
    () => (data && library
      ? suggestTripPhotos(library, { startsOn: data.trip.startsOn, endsOn: data.trip.endsOn, timeZone, trace })
      : null),
    [data, library, timeZone, trace],
  );
  const selected = useMemo(() => selectedIds ?? suggestion?.preselectedIds ?? [], [selectedIds, suggestion]);

  const slides = useMemo(() => {
    if (!data || !suggestion) return [];
    const recap = buildTripRecap(data);
    const summaryLines = [
      recap.days ? `${recap.days} jours` : null,
      recap.stops.length > 0 ? recap.stops.join(" → ") : null,
      recap.distance ? `${recap.distance} parcourus` : null,
      recap.activityCount > 0 ? `${recap.activityCount} activité${recap.activityCount > 1 ? "s" : ""}` : null,
    ].filter((line): line is string => line !== null);
    const chosen = suggestion.photos.filter((photo) => selected.includes(photo.id));
    return buildStorySlides({ title: recap.title, dates: recap.dates, summaryLines, photos: chosen, trace, stops: data.stops, timeZone });
  }, [data, selected, suggestion, timeZone, trace]);

  const toggle = useCallback((photoId: string) => {
    setMessage(null);
    setSelectedIds((current) => {
      const base = current ?? suggestion?.preselectedIds ?? [];
      return base.includes(photoId) ? base.filter((id) => id !== photoId) : [...base, photoId];
    });
  }, [suggestion]);

  return (
    <TripStoriesScreen
      tripName={data?.trip.name ?? "Voyage"}
      access={access}
      photos={suggestion?.photos ?? []}
      selectedIds={selected}
      slides={slides}
      trace={trace}
      loading={!data || (library === null && (access === "granted" || access === "limited"))}
      busy={busy}
      error={error}
      message={message}
      onBack={() => router.back()}
      onRequestAccess={() => {
        void MediaLibrary.requestPermissionsAsync(false).then((permission) => setAccess(toAccess(permission)));
      }}
      onToggle={toggle}
      onSave={async (views) => {
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
          const permission = await MediaLibrary.requestPermissionsAsync(true);
          if (!permission.granted) throw new Error("Autorisez l’ajout de photos pour enregistrer les stories.");
          let saved = 0;
          for (const view of views) {
            if (!view) continue;
            await MediaLibrary.saveToLibraryAsync(await captureRef(view, CAPTURE));
            saved += 1;
          }
          setMessage(`${saved} stor${saved > 1 ? "ies enregistrées" : "y enregistrée"} dans Photos, prête${saved > 1 ? "s" : ""} pour Instagram.`);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
        } finally {
          setBusy(false);
        }
      }}
      onShare={async (view: View | null) => {
        if (!view) return;
        setError(null);
        try {
          await Share.share({ url: await captureRef(view, CAPTURE) });
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Partage impossible.");
        }
      }}
    />
  );
}

function toAccess(permission: MediaLibrary.PermissionResponse): PhotoAccess {
  if (permission.granted) return permission.accessPrivileges === "limited" ? "limited" : "granted";
  return permission.canAskAgain ? "unknown" : "denied";
}

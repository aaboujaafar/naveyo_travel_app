import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Linking } from "react-native";
import { useNaveyoBootstrap } from "../../../../../src/bootstrap";
import type {
  PlaceCandidate,
  Stop,
  UUID,
} from "../../../../../src/modules/_shared/model";
import { PlaceDetailScreen } from "../../../../../src/screens/PlaceDetailScreen";
import {
  buildPlaceScheduleDates,
  type PlaceScheduleDate,
} from "../../../../../src/screens/place-detail-model";

export default function PlaceDetailRoute() {
  const router = useRouter();
  const bootstrap = useNaveyoBootstrap();
  const { tripId: rawTripId, placeId: rawPlaceId } = useLocalSearchParams<{
    tripId: string;
    placeId: string;
  }>();
  const tripId = rawTripId as UUID | undefined;
  const placeId = rawPlaceId as UUID | undefined;
  const [place, setPlace] = useState<PlaceCandidate | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!bootstrap || !tripId || !placeId) {
      setError(
        !bootstrap
          ? "Le Module Places n'est pas encore exposé par la composition de l'application."
          : "L'identifiant du Voyage ou du lieu est absent.",
      );
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const [nextPlace, nextStops] = await Promise.all([
        bootstrap.modules.places.getById(placeId, tripId),
        bootstrap.modules.trips.listStops(tripId),
      ]);
      setPlace(nextPlace);
      setStops(nextStops);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Impossible de charger le lieu.",
      );
    } finally {
      setLoading(false);
    }
  }, [bootstrap, placeId, tripId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const addToItinerary = useCallback(
    async (selection: PlaceScheduleDate) => {
      if (!bootstrap || !tripId || !place) return;
      setSaving(true);
      setError(null);
      try {
        await bootstrap.modules.itinerary.addConfirmedPlace({
          tripId,
          stopId: selection.stopId,
          date: selection.date,
          title: place.name,
          place,
        });
      } catch (cause: unknown) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Impossible d'ajouter ce lieu à l'itinéraire.";
        setError(message);
        throw cause;
      } finally {
        setSaving(false);
      }
    },
    [bootstrap, place, tripId],
  );

  const openDirections = useCallback(async () => {
    if (!place) return;
    const query = encodeURIComponent(
      place.address ? `${place.name}, ${place.address}` : place.name,
    );
    await Linking.openURL(
      `http://maps.apple.com/?ll=${place.coordinates.latitude},${place.coordinates.longitude}&q=${query}`,
    );
  }, [place]);

  const routeTripId = rawTripId ?? "";

  return (
    <PlaceDetailScreen
      place={place}
      scheduleDates={buildPlaceScheduleDates(stops)}
      loading={loading}
      saving={saving}
      error={error}
      onBack={() => router.back()}
      onRetry={load}
      onOpenMap={() =>
        router.push(`/(app)/trips/${routeTripId}/itinerary`)
      }
      onOpenDirections={openDirections}
      onAddToItinerary={addToItinerary}
    />
  );
}

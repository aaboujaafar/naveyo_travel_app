import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Share } from "react-native";
import type { MapModel } from "../../../../src/adapters/map";
import { useNaveyoBootstrap } from "../../../../src/bootstrap";
import type { Expense } from "../../../../src/modules/expenses";
import type { ItineraryItem, Reservation, Stop, TrackPoint, Trip, UUID } from "../../../../src/modules/_shared/model";
import { TripRecapScreen } from "../../../../src/screens/TripRecapScreen";
import { buildTripRecap } from "../../../../src/screens/trip-recap-model";

interface RecapData {
  trip: Trip;
  stops: Stop[];
  itinerary: ItineraryItem[];
  reservations: Reservation[];
  expenses: Expense[];
  trackPoints: TrackPoint[];
}

export default function TripRecapRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const tripId = typeof rawTripId === "string" ? (rawTripId as UUID) : undefined;
  const bootstrap = useNaveyoBootstrap();
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bootstrap || !tripId) return;
    const { modules } = bootstrap;
    let active = true;
    // Each part is optional: a recap with fewer figures beats no recap at all.
    const optional = <T,>(promise: Promise<T[]>) => promise.catch(() => [] as T[]);
    void (async () => {
      try {
        const [trip, stops, itinerary, reservations, expenses, trackPoints] = await Promise.all([
          modules.trips.get(tripId),
          modules.trips.listStops(tripId),
          optional(modules.itinerary.list(tripId)),
          optional(modules.reservations.list(tripId)),
          optional(modules.expenses.list(tripId)),
          optional(modules.tripTracking.list(tripId)),
        ]);
        if (!active) return;
        if (!trip) setError("Ce Voyage n’est plus accessible.");
        else setData({ trip, stops, itinerary, reservations, expenses, trackPoints });
      } catch (cause) {
        const pack = await modules.offlineTripPack.get(tripId).catch(() => null);
        if (!active) return;
        if (pack) {
          setData({ trip: pack.trip, stops: pack.stops, itinerary: pack.itinerary, reservations: pack.reservations, expenses: [], trackPoints: [] });
        } else {
          setError(cause instanceof Error ? cause.message : "Impossible de charger le récap.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [bootstrap, tripId]);

  const recap = useMemo(() => (data ? buildTripRecap(data) : null), [data]);
  const map = useMemo<MapModel | null>(() => {
    if (!data || data.trackPoints.length < 2) return null;
    const polyline = data.trackPoints.map((point) => ({ latitude: point.latitude, longitude: point.longitude }));
    return {
      points: data.stops.flatMap((stop) => (stop.coordinates ? [{ id: stop.id, label: stop.name, coordinates: stop.coordinates }] : [])),
      polyline,
    };
  }, [data]);

  return (
    <TripRecapScreen
      recap={recap}
      imageUrl={data?.trip.imageUrl}
      map={map}
      loading={loading}
      error={error}
      onBack={() => router.back()}
      onCreateAlbum={rawTripId ? () => router.push(`/(app)/trips/${rawTripId}/album`) : undefined}
      onCreateStories={rawTripId ? () => router.push(`/(app)/trips/${rawTripId}/stories`) : undefined}
      onShare={() => {
        if (recap) void Share.share({ message: recap.shareText });
      }}
    />
  );
}

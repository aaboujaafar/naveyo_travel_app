import { useRouter } from "expo-router";
import { useTripTabParams } from "../../../../../../src/ui/TripRouteContext";
import { useEffect, useState } from "react";
import { useNaveyoBootstrap } from "../../../../../../src/bootstrap";
import type {
  ItineraryItem,
  Stop,
  TrackPoint,
  UUID,
} from "../../../../../../src/modules/_shared/model";
import type { OfflineTripPackLoad } from "../../../../../../src/modules/offline-trip-pack";
import { TripItineraryScreen } from "../../../../../../src/screens/TripItineraryScreen";

export default function ItineraryRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useTripTabParams<{ tripId: string }>();
  const tripId = typeof rawTripId === "string" ? (rawTripId as UUID) : null;
  const bootstrap = useNaveyoBootstrap();
  const [stops, setStops] = useState<Stop[]>([]);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [offline, setOffline] = useState<OfflineTripPackLoad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bootstrap || !tripId) {
      return;
    }
    let active = true;
    Promise.all([
      bootstrap.modules.trips.listStops(tripId),
      bootstrap.modules.itinerary.list(tripId),
      bootstrap.modules.tripTracking.list(tripId),
      bootstrap.modules.offlineTripPack.load(tripId),
    ])
      .then(([nextStops, nextItems, nextTrackPoints, nextOffline]) => {
        if (!active) return;
        setStops(nextStops);
        setItems(nextItems);
        setTrackPoints(nextTrackPoints);
        setOffline(nextOffline);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger l’itinéraire",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bootstrap, tripId]);

  return (
    <TripItineraryScreen
      stops={stops}
      items={items}
      trackPoints={trackPoints}
      offline={offline}
      loading={loading}
      error={error}
      onOpenAssistant={(stopId) => {
        if (tripId) {
          router.push(`/trips/${tripId}/assistant?stopId=${stopId}&mode=day`);
        }
      }}
      onOpenTracking={() => {
        if (tripId) router.push(`/(app)/trips/${tripId}/tracking`);
      }}
      onCalculateRoute={async (coordinates) => {
        if (!bootstrap || !tripId || !bootstrap.modules.routing) return null;
        const result = await bootstrap.modules.routing.calculate({
          tripId,
          coordinates,
          mode: "drive",
        });
        return result?.geometry ?? null;
      }}
    />
  );
}

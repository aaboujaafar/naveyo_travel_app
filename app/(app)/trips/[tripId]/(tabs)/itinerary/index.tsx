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
import { downloadTripPack, type OfflineTripPackLoad } from "../../../../../../src/modules/offline-trip-pack";
import { TripItineraryScreen, type PlaceDetails } from "../../../../../../src/screens/TripItineraryScreen";
import { exportTripCalendar } from "../../../../../../src/adapters/expo-calendar";
import { buildCalendarEvents } from "../../../../../../src/screens/calendar-export-model";

export default function ItineraryRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useTripTabParams<{ tripId: string }>();
  const tripId = typeof rawTripId === "string" ? (rawTripId as UUID) : null;
  const bootstrap = useNaveyoBootstrap();
  const [stops, setStops] = useState<Stop[]>([]);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [offline, setOffline] = useState<OfflineTripPackLoad | null>(null);
  const [placeDetails, setPlaceDetails] = useState<Record<string, PlaceDetails>>({});
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
        // Category and opening hours of each planned place: fresh from the provider, else from the offline pack.
        const known = new Map((nextOffline.pack?.places ?? []).map((place) => [place.id as string, place]));
        const placeIds = Array.from(new Set(nextItems.flatMap((item) => (item.place?.placeId ? [item.place.placeId] : []))));
        void Promise.all(
          placeIds.map(async (placeId) => {
            const place = (await bootstrap.modules.places.getById(placeId, tripId).catch(() => null)) ?? known.get(placeId);
            return [placeId, { category: place?.category, openingHours: place?.openingHours }] as const;
          }),
        ).then((entries) => {
          if (active) setPlaceDetails(Object.fromEntries(entries));
        });
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
      placeDetails={placeDetails}
      loading={loading}
      error={error}
      onMoveItem={bootstrap?.modules.itinerary.move && tripId ? async (item, target) => {
        const itinerary = bootstrap.modules.itinerary;
        await itinerary.move?.({ tripId, itemId: item.id, stopId: target.stopId, date: target.date });
        setItems(await itinerary.list(tripId));
      } : undefined}
      onRemoveItem={bootstrap?.modules.itinerary.remove && tripId ? async (item) => {
        const itinerary = bootstrap.modules.itinerary;
        await itinerary.remove?.(tripId, item.id);
        setItems(await itinerary.list(tripId));
      } : undefined}
      onExportCalendar={async () => {
        if (!bootstrap || !tripId) throw new Error("Le Voyage n’est pas chargé.");
        const { modules } = bootstrap;
        const [trip, reservations, latestItems] = await Promise.all([
          modules.trips.get(tripId),
          modules.reservations.list(tripId).catch(() => []),
          modules.itinerary.list(tripId).catch(() => items),
        ]);
        const tripName = trip?.name ?? "Voyage";
        const count = await exportTripCalendar(tripName, buildCalendarEvents({ items: latestItems, reservations, stops }));
        return { count, calendarName: `Naveyo · ${tripName}` };
      }}
      onDownloadOffline={async () => {
        if (!bootstrap || !tripId) return;
        const { modules } = bootstrap;
        await downloadTripPack(
          tripId,
          {
            getTrip: (id) => modules.trips.get(id),
            listStops: (id) => modules.trips.listStops(id),
            listItinerary: (id) => modules.itinerary.list(id),
            getPlace: (placeId, id) => modules.places.getById(placeId, id),
            listReservations: (id) => modules.reservations.list(id),
            listDocuments: (id) => modules.documents.list(id),
            // The pack format requires a payer; an expense without one stays online only.
            listExpenses: async (id) =>
              (await modules.expenses.list(id)).flatMap((expense) =>
                expense.paidBy ? [{ ...expense, paidBy: expense.paidBy }] : [],
              ),
          },
          modules.offlineTripPack,
        );
        setOffline(await modules.offlineTripPack.load(tripId));
      }}
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

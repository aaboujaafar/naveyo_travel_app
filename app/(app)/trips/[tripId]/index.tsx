import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { sharedLocalReservations } from "../../../../src/bootstrap/reservations";
import type {
  Reservation,
  Stop,
  Trip,
  UUID,
} from "../../../../src/modules/_shared/model";
import { useTripsModule } from "../../../../src/modules/trips";
import { TripDashboardScreen } from "../../../../src/screens/TripDashboardScreen";

export default function TripDetailRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const trips = useTripsModule();
  const tripId = rawTripId as UUID | undefined;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!trips || !tripId) {
      setError(
        !trips
          ? "Le Module Trips n'est pas disponible."
          : "L'identifiant du Voyage est absent.",
      );
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const [nextTrip, nextStops] = await Promise.all([
        trips.get(tripId),
        trips.listStops(tripId),
      ]);
      setTrip(nextTrip);
      setStops(nextStops);
      try {
        setReservations(await sharedLocalReservations.list(tripId));
      } catch {
        setReservations([]);
        setError(
          "Le Voyage est chargé, mais les Réservations sont temporairement indisponibles.",
        );
      }
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de charger le Voyage.",
      );
    } finally {
      setLoading(false);
    }
  }, [tripId, trips]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const routeTripId = rawTripId ?? "";

  return (
    <TripDashboardScreen
      trip={trip}
      stops={stops}
      reservations={reservations}
      loading={loading}
      error={error}
      onRefresh={load}
      onOpenSettings={() =>
        router.push(`/(app)/trips/${routeTripId}/settings`)
      }
      onOpenAssistant={() =>
        stops[0]
          ? router.push(
              `/(app)/trips/${routeTripId}/assistant?stopId=${stops[0].id}`,
            )
          : router.push(`/(app)/trips/${routeTripId}/stops/new`)
      }
      onOpenItinerary={() =>
        router.push(`/(app)/trips/${routeTripId}/itinerary`)
      }
      onOpenStop={(stop) =>
        router.push(`/(app)/trips/${routeTripId}/stops/${stop.id}`)
      }
      onOpenExpenses={() =>
        router.push(`/(app)/trips/${routeTripId}/expenses`)
      }
      onOpenReservations={() =>
        router.push(`/(app)/trips/${routeTripId}/reservations`)
      }
      onOpenDocuments={() =>
        router.push(`/(app)/trips/${routeTripId}/documents`)
      }
    />
  );
}

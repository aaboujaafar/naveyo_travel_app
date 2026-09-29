import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Linking } from "react-native";
import { useNaveyoBootstrap } from "../../../../../src/bootstrap";
import type { PlaceReference, Reservation, UUID } from "../../../../../src/modules/_shared/model";
import { useTripsModule } from "../../../../../src/modules/trips";
import { TripReservationsScreen } from "../../../../../src/screens/TripReservationsScreen";

export default function ReservationsRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const tripId = rawTripId as UUID | undefined;
  const trips = useTripsModule();
  const bootstrap = useNaveyoBootstrap();
  const [tripName, setTripName] = useState("Voyage");
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId || !bootstrap) {
      setError("L'identifiant du Voyage est absent.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextItems, trip] = await Promise.all([
        bootstrap.modules.reservations.list(tripId),
        trips?.get(tripId) ?? Promise.resolve(null),
      ]);
      setItems(nextItems);
      setTripName(trip?.name ?? "Voyage");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger les Réservations.");
    } finally {
      setLoading(false);
    }
  }, [bootstrap, tripId, trips]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openNavigation = useCallback(async (place: PlaceReference, provider: "apple" | "waze") => {
    const query = encodeURIComponent(place.address ? `${place.label}, ${place.address}` : place.label);
    const coordinates = place.coordinates;
    const url = provider === "apple"
      ? coordinates
        ? `http://maps.apple.com/?ll=${coordinates.latitude},${coordinates.longitude}&q=${query}`
        : `http://maps.apple.com/?q=${query}`
      : coordinates
        ? `https://waze.com/ul?ll=${coordinates.latitude},${coordinates.longitude}&navigate=yes`
        : `https://waze.com/ul?q=${query}&navigate=yes`;
    await Linking.openURL(url);
  }, []);

  const routeTripId = rawTripId ?? "";
  return (
    <TripReservationsScreen
      tripName={tripName}
      items={items}
      loading={loading}
      error={error}
      onBack={() => router.back()}
      onRetry={load}
      onOpenDocuments={() => router.replace(`/(app)/trips/${routeTripId}/documents`)}
      onOpenPacking={() => router.replace(`/(app)/trips/${routeTripId}/packing`)}
      onImport={() => router.push(`/(app)/imports?tripId=${routeTripId}`)}
      onOpenNavigation={openNavigation}
    />
  );
}

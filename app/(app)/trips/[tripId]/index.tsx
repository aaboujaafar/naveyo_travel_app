import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useNaveyoBootstrap } from "../../../../src/bootstrap";
import { sharedLocalReservations } from "../../../../src/bootstrap/reservations";
import type {
  Coordinates,
  ItineraryItem,
  Reservation,
  Stop,
  Trip,
  UUID,
} from "../../../../src/modules/_shared/model";
import { useTripsModule } from "../../../../src/modules/trips";
import { TripDashboardScreen } from "../../../../src/screens/TripDashboardScreen";
import type { DashboardWeatherState } from "../../../../src/screens/TripDashboardScreen";
import { dashboardRouteCoordinates } from "../../../../src/screens/trip-dashboard-model";

export default function TripDetailRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const trips = useTripsModule();
  const bootstrap = useNaveyoBootstrap();
  const tripId = rawTripId as UUID | undefined;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<DashboardWeatherState>({ status: "loading" });
  const [routePolyline, setRoutePolyline] = useState<Coordinates[]>([]);

  const load = useCallback(async () => {
    if (!trips || !bootstrap || !tripId) {
      setError(
        !trips
          ? "Le Module Trips n'est pas disponible."
          : !bootstrap
            ? "Les Modules du Voyage ne sont pas disponibles."
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
      let loadedItinerary: ItineraryItem[] = [];
      try {
        loadedItinerary = await bootstrap.modules.itinerary.list(tripId);
        setItineraryItems(loadedItinerary);
        if (bootstrap.modules.routing) {
          const routeCoordinates = dashboardRouteCoordinates(nextStops, loadedItinerary);
          if (routeCoordinates.length >= 2) {
            try {
              const route = await bootstrap.modules.routing.calculate({
                tripId,
                coordinates: routeCoordinates,
                mode: "drive",
              });
              setRoutePolyline(route?.geometry ?? []);
            } catch {
              setRoutePolyline([]);
            }
          } else {
            setRoutePolyline([]);
          }
        } else {
          setRoutePolyline([]);
        }
      } catch {
        setItineraryItems([]);
        setError(
          "Le Voyage et ses Étapes sont chargés, mais les lieux de la carte sont temporairement indisponibles.",
        );
      }
      const itineraryItem = loadedItinerary.find((item) => item.place?.coordinates);
      const stop = itineraryItem ? nextStops.find((candidate) => candidate.id === itineraryItem.stopId) : nextStops[0];
      let coordinates = itineraryItem?.place?.coordinates ?? stop?.coordinates;
      if (!coordinates && stop) {
        try {
          coordinates = (await bootstrap.modules.places.search({ query: stop.name, countryCode: stop.countryCode, stopId: stop.id, tripId })).at(0)?.coordinates;
        } catch {
          coordinates = undefined;
        }
      }
      if (!coordinates || !stop) {
        setWeather({ status: "empty", message: "Ajoutez une Étape géolocalisable pour afficher la météo." });
      } else {
        try {
          const forecast = await bootstrap.modules.weather.forecast({ coordinates, timeZone: stop.timeZone, startDate: stop.startDate, endDate: stop.endDate });
          setWeather({ status: "ready", updatedAt: forecast.fetchedAt, days: forecast.daily.slice(0, 7).map((day) => ({ date: day.date, label: formatWeatherDate(day.date, stop.timeZone), icon: weatherIcon(day.weatherCode), temperatureMin: day.temperatureMinC, temperatureMax: day.temperatureMaxC, precipitationProbabilityMax: day.precipitationProbabilityMax })) });
        } catch (cause) {
          setWeather({ status: "error", message: cause instanceof Error ? cause.message : "Météo indisponible" });
        }
      }
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
  }, [bootstrap, tripId, trips]);

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
      itineraryItems={itineraryItems}
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
      onOpenCreateStop={() =>
        router.push(`/(app)/trips/${routeTripId}/stops/new`)
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
      weather={weather}
      routePolyline={routePolyline}
    />
  );
}

function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

function formatWeatherDate(value: string, timeZone: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone }).format(date);
}

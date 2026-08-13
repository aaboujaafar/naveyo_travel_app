import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useNaveyoBootstrap } from "../../../../../src/bootstrap";
import { useDocuments } from "../../../../../src/modules/documents";
import { useTripsModule } from "../../../../../src/modules/trips";
import type {
  ItineraryItem,
  Reservation,
  Stop,
  TravelDocument,
  UUID,
} from "../../../../../src/modules/_shared/model";
import { StopDetailScreen } from "../../../../../src/screens/StopDetailScreen";
import type { StopWeatherViewModel } from "../../../../../src/screens/StopDetailScreen";
import {
  filterItineraryForStop,
  filterReservationsForStop,
} from "../../../../../src/screens/stop-detail-model";

export default function StopDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tripId?: string | string[];
    stopId?: string | string[];
  }>();
  const tripId = singleParam(params.tripId) as UUID | null;
  const stopId = singleParam(params.stopId) as UUID | null;
  const bootstrap = useNaveyoBootstrap();
  const trips = useTripsModule();
  const documentsModule = useDocuments();
  const [tripName, setTripName] = useState("Voyage");
  const [stop, setStop] = useState<Stop | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [downloadedDocumentId, setDownloadedDocumentId] = useState<UUID | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<StopWeatherViewModel>({ status: "loading" });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!tripId || !stopId) {
      setError("L'identifiant du Voyage ou de l'Étape est absent.");
      setLoading(false);
      return;
    }
    if (!bootstrap || !trips || !documentsModule) {
      setError("Les Modules du Voyage ne sont pas disponibles.");
      setLoading(false);
      return;
    }

    try {
      const [trip, stops, allItinerary, stopDocuments, allReservations] = await Promise.all([
        trips.get(tripId),
        trips.listStops(tripId),
        bootstrap.modules.itinerary.list(tripId),
        documentsModule.list(tripId, stopId),
        bootstrap.modules.reservations.list(tripId),
      ]);
      if (!trip) throw new Error("Voyage introuvable ou inaccessible.");
      const selectedStop = stops.find((candidate) => candidate.id === stopId) ?? null;
      if (!selectedStop) throw new Error("Étape introuvable dans ce Voyage.");

      setTripName(trip.name);
      setStop(selectedStop);
      setItinerary(filterItineraryForStop(allItinerary, selectedStop));
      setDocuments(stopDocuments);
      setReservations(filterReservationsForStop(allReservations, stopDocuments));
      const itineraryPlace = filterItineraryForStop(allItinerary, selectedStop).find((item) => item.place?.coordinates)?.place;
      let coordinates = itineraryPlace?.coordinates ?? selectedStop.coordinates;
      if (!coordinates) {
        try {
          coordinates = (await bootstrap.modules.places.search({ query: selectedStop.name, countryCode: selectedStop.countryCode, stopId: selectedStop.id, tripId })).at(0)?.coordinates;
        } catch {
          coordinates = undefined;
        }
      }
      if (!coordinates) {
        setWeather({ status: "unavailable", errorMessage: "Impossible de géolocaliser cette Étape pour afficher la météo." });
      } else {
        try {
          const forecast = await bootstrap.modules.weather.forecast({ coordinates, timeZone: selectedStop.timeZone, startDate: selectedStop.startDate, endDate: selectedStop.endDate });
          setWeather({ status: "ready", updatedAt: forecast.fetchedAt, days: forecast.daily.map((day) => ({ date: day.date, weatherCode: day.weatherCode, temperatureMinC: day.temperatureMinC, temperatureMaxC: day.temperatureMaxC, precipitationProbabilityMax: day.precipitationProbabilityMax, precipitationSumMm: day.precipitationSumMm, uvIndexMax: day.uvIndexMax, windGustsMaxKmh: day.windGustsMaxKmh })) });
        } catch (cause) {
          setWeather({ status: "error", errorMessage: cause instanceof Error ? cause.message : "Météo indisponible" });
        }
      }
    } catch (cause: unknown) {
      setStop(null);
      setItinerary([]);
      setDocuments([]);
      setReservations([]);
      setError(cause instanceof Error ? cause.message : "Impossible de charger l'Étape.");
    } finally {
      setLoading(false);
    }
  }, [bootstrap, documentsModule, stopId, tripId, trips]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  async function download(document: TravelDocument) {
    if (!documentsModule || !tripId) return;
    setError(null);
    try {
      await documentsModule.download(tripId, document.id);
      setDownloadedDocumentId(document.id);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible de télécharger le Document.");
    }
  }

  const routeTripId = tripId ?? "";
  const routeStopId = stopId ?? "";

  return (
    <StopDetailScreen
      tripName={tripName}
      stop={stop}
      itinerary={itinerary}
      documents={documents}
      reservations={reservations}
      loading={loading}
      error={error}
      weather={weather}
      downloadedDocumentId={downloadedDocumentId}
      onBack={() => router.back()}
      onRetry={refresh}
      onDownload={download}
      onOpenItinerary={() => router.push(`/(app)/trips/${routeTripId}/itinerary`)}
      onOpenDocuments={() => router.push(`/(app)/trips/${routeTripId}/documents?stopId=${routeStopId}`)}
      onOpenReservations={() => router.push(`/(app)/trips/${routeTripId}/reservations`)}
      onEditLocation={() => router.push(`/(app)/trips/${routeTripId}/stops/${routeStopId}/edit`)}
    />
  );
}

function singleParam(value?: string | string[]): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.trim() ? candidate : null;
}

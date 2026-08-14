import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useNaveyoBootstrap } from "../../../../../src/bootstrap";
import { useDocuments } from "../../../../../src/modules/documents";
import { useTripsModule } from "../../../../../src/modules/trips";
import type {
  ItineraryItem,
  PlaceCandidate,
  Reservation,
  Stop,
  TravelDocument,
  UUID,
} from "../../../../../src/modules/_shared/model";
import {
  StopDetailScreen,
  type ActivitySchedule,
  type ManualPlaceSearchViewModel,
  type StopDiscoveryViewModel,
  type StopWeatherViewModel,
} from "../../../../../src/screens/StopDetailScreen";
import {
  filterItineraryForStop,
  filterReservationsForStop,
} from "../../../../../src/screens/stop-detail-model";
import {
  discoveryNote,
  loadStopDiscovery,
  type StopDiscoveryKind,
} from "../../../../../src/screens/stop-discovery-model";

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
  const [discovery, setDiscovery] = useState<StopDiscoveryViewModel>({ status: "loading", sections: [] });
  const [addingPlaceId, setAddingPlaceId] = useState<UUID | null>(null);
  const [addingReservationId, setAddingReservationId] = useState<UUID | null>(null);
  const [addedReservationIds, setAddedReservationIds] = useState<UUID[]>([]);
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<PlaceCandidate[]>([]);
  const [manualLoading, setManualLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWeather({ status: "loading" });
    setDiscovery({ status: "loading", sections: [] });
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
      setReservations(reservationsForStop(allReservations, stopDocuments, selectedStop));
      const itineraryPlace = filterItineraryForStop(allItinerary, selectedStop).find((item) => item.place?.coordinates)?.place;
      let coordinates = itineraryPlace?.coordinates ?? selectedStop.coordinates;
      if (!coordinates) {
        try {
          coordinates = (await bootstrap.modules.places.search({ query: selectedStop.name, countryCode: selectedStop.countryCode, stopId: selectedStop.id, tripId })).at(0)?.coordinates;
        } catch {
          coordinates = undefined;
        }
      }
      const weatherRequest = (async () => {
        if (!coordinates) {
          setWeather({ status: "unavailable", errorMessage: "Impossible de géolocaliser cette Étape pour afficher la météo." });
          return;
        }
        try {
          const forecast = await bootstrap.modules.weather.forecast({ coordinates, timeZone: selectedStop.timeZone, startDate: selectedStop.startDate, endDate: selectedStop.endDate });
          setWeather({ status: "ready", updatedAt: forecast.fetchedAt, days: forecast.daily.filter((day) => day.date >= selectedStop.startDate && day.date <= selectedStop.endDate).map((day) => ({ date: day.date, weatherCode: day.weatherCode, temperatureMinC: day.temperatureMinC, temperatureMaxC: day.temperatureMaxC, precipitationProbabilityMax: day.precipitationProbabilityMax, precipitationSumMm: day.precipitationSumMm, uvIndexMax: day.uvIndexMax, windGustsMaxKmh: day.windGustsMaxKmh })) });
        } catch (cause) {
          setWeather({ status: "error", errorMessage: cause instanceof Error ? cause.message : "Météo indisponible" });
        }
      })();
      const discoveryRequest = loadStopDiscovery(bootstrap.modules.places, tripId, selectedStop, coordinates)
        .then((sections) => setDiscovery({ status: "ready", sections }))
        .catch((cause: unknown) => setDiscovery({ status: "error", sections: [], errorMessage: cause instanceof Error ? cause.message : "Suggestions indisponibles" }));
      await Promise.all([weatherRequest, discoveryRequest]);
    } catch (cause: unknown) {
      setStop(null);
      setItinerary([]);
      setDocuments([]);
      setReservations([]);
      setDiscovery({ status: "error", sections: [], errorMessage: "Impossible de charger les suggestions." });
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

  async function addDiscovery(place: PlaceCandidate, kind: StopDiscoveryKind, schedule: ActivitySchedule) {
    if (!bootstrap || !tripId || !stop) return;
    setAddingPlaceId(place.id);
    setError(null);
    try {
      const added = await bootstrap.modules.itinerary.addConfirmedPlace({
        tripId,
        stopId: stop.id,
        date: schedule.date,
        title: place.name,
        place,
        ...(schedule.time ? { time: { local: `${schedule.date}T${schedule.time}`, timeZone: stop.timeZone } } : {}),
        notes: discoveryNote(kind),
      });
      setItinerary((current) => filterItineraryForStop([...current, added], stop));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d'ajouter ce lieu à l'Étape.");
    } finally {
      setAddingPlaceId(null);
    }
  }

  async function searchManualPlaces() {
    if (!bootstrap || !tripId || !stop || manualQuery.trim().length < 2) return;
    setManualLoading(true);
    try {
      const results = await bootstrap.modules.places.search({
        query: manualQuery.trim(),
        tripId,
        stopId: stop.id,
        stopName: stop.name,
        countryCode: stop.countryCode,
        type: "venue",
        near: stop.coordinates ? { ...stop.coordinates, radiusMeters: 5_000 } : undefined,
      });
      setManualResults(results.slice(0, 6));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de géocoder cette activité.");
      setManualResults([]);
    } finally {
      setManualLoading(false);
    }
  }

  async function addReservationToItinerary(reservation: Reservation) {
    if (!bootstrap || !tripId || !stop) return;
    const places = [reservation.venue, reservation.origin, reservation.destination].filter((place): place is NonNullable<Reservation["venue"]> => Boolean(place));
    if (places.length === 0) return;
    setAddingReservationId(reservation.id);
    try {
      for (const [index, place] of places.entries()) {
        const scheduled = index === 0 ? reservation.start : reservation.end ?? reservation.start;
        await bootstrap.modules.itinerary.add({
          tripId,
          stopId: stop.id,
          date: scheduled?.local.slice(0, 10) ?? stop.startDate,
          title: places.length > 1 ? `${reservation.title} · ${index === 0 ? "Départ" : "Arrivée"}` : reservation.title,
          place,
          ...(scheduled ? { time: scheduled } : {}),
          notes: reservation.type === "accommodation" ? "Logement issu d’une réservation" : "Transfert issu d’une réservation",
        });
      }
      const refreshed = await bootstrap.modules.itinerary.list(tripId);
      setItinerary(filterItineraryForStop(refreshed, stop));
      setAddedReservationIds((current) => current.includes(reservation.id) ? current : [...current, reservation.id]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d’ajouter la réservation à l’Étape.");
    } finally {
      setAddingReservationId(null);
    }
  }

  const routeTripId = tripId ?? "";
  const routeStopId = stopId ?? "";
  const manualPlaceSearch: ManualPlaceSearchViewModel = {
    query: manualQuery,
    results: manualResults,
    loading: manualLoading,
    onQueryChange: (query) => {
      setManualQuery(query);
      if (!query.trim()) setManualResults([]);
    },
    onSearch: searchManualPlaces,
  };

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
      discovery={discovery}
      addingPlaceId={addingPlaceId}
      downloadedDocumentId={downloadedDocumentId}
      onBack={() => router.back()}
      onRetry={refresh}
      onDownload={download}
      onOpenItinerary={() => router.push(`/(app)/trips/${routeTripId}/itinerary`)}
      onOpenDocuments={() => router.push(`/(app)/trips/${routeTripId}/documents?stopId=${routeStopId}`)}
      onOpenReservations={() => router.push(`/(app)/trips/${routeTripId}/reservations`)}
      onEditLocation={() => router.push(`/(app)/trips/${routeTripId}/stops/${routeStopId}/edit`)}
      onAddDiscovery={addDiscovery}
      manualPlaceSearch={manualPlaceSearch}
      onAddReservationToItinerary={addReservationToItinerary}
      addingReservationId={addingReservationId}
      addedReservationIds={addedReservationIds}
    />
  );
}

function singleParam(value?: string | string[]): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.trim() ? candidate : null;
}

function reservationsForStop(reservations: Reservation[], documents: TravelDocument[], stop: Stop): Reservation[] {
  const linked = filterReservationsForStop(reservations, documents);
  const linkedIds = new Set(linked.map((reservation) => reservation.id));
  const inferred = reservations.filter((reservation) => {
    if (linkedIds.has(reservation.id) || !["accommodation", "activity", "flight", "train", "ferry"].includes(reservation.type)) return false;
    const date = reservation.start?.local.slice(0, 10);
    const hasPlace = Boolean(reservation.venue || reservation.origin || reservation.destination);
    return hasPlace && Boolean(date && date >= stop.startDate && date <= stop.endDate);
  });
  return [...linked, ...inferred];
}

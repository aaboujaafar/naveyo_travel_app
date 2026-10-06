import { useFocusEffect, useRouter, type Href } from "expo-router";
import type { LogisticsGap, StoredWaiver } from "../../../../../src/modules/logistics";
import { findCityCode } from "../../../../../src/adapters/travelpayouts/city-codes";
import { PartnerSearchSheet, type PartnerSearchGroup } from "../../../../../src/screens/PartnerSearchSheet";
import { journeyGroups, stayGroups } from "../../../../../src/screens/partner-search-model";
import { LogisticsTunnelSheet } from "../../../../../src/screens/LogisticsTunnelSheet";
import { consumeLogisticsTunnel } from "../../../../../src/screens/logistics-tunnel-store";
import { detectLogisticsGaps } from "../../../../../src/modules/logistics";
import { effectiveDeparture, type CityRef } from "../../../../../src/modules/trip-profiles";
import { useTripTabParams } from "../../../../../src/ui/TripRouteContext";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking } from "react-native";
import { useNaveyoBootstrap } from "../../../../../src/bootstrap";
import type {
  Coordinates,
  ItineraryItem,
  Money,
  Reservation,
  Stop,
  Trip,
  UUID,
} from "../../../../../src/modules/_shared/model";
import { useTripsModule } from "../../../../../src/modules/trips";
import { TripDashboardScreen } from "../../../../../src/screens/TripDashboardScreen";
import type { DashboardSummary, DashboardWeatherState } from "../../../../../src/screens/TripDashboardScreen";
import { buildTodayPlan, localNow } from "../../../../../src/screens/today-model";
import { planBAssistantPath } from "../../../../../src/screens/weather-plan-b";
import { dashboardRouteCoordinates } from "../../../../../src/screens/trip-dashboard-model";

export default function TripDetailRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useTripTabParams<{ tripId: string }>();
  const trips = useTripsModule();
  const bootstrap = useNaveyoBootstrap();
  const tripId = rawTripId as UUID | undefined;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [departure, setDeparture] = useState<CityRef | null>(null);
  const [waivers, setWaivers] = useState<StoredWaiver[]>([]);
  const logistics = useMemo(
    () => (stops.length > 0 ? detectLogisticsGaps({ stops, reservations, departure, waivers: waivers.map((item) => item.waiver) }) : null),
    [departure, reservations, stops, waivers],
  );
  // The stays and transport questions: opened at a gap, or after creating the Voyage or an Étape.
  const [tunnelStart, setTunnelStart] = useState<string | null>(null);
  const [search, setSearch] = useState<{ title: string; summary: string; groups: PartnerSearchGroup[] | null } | null>(null);
  const openSearch = async (gap: LogisticsGap) => {
    setTunnelStart(null);
    const party = await bootstrap?.modules.tripProfiles?.getParty(tripId as UUID).catch(() => null);
    const people = { adults: party?.adults ?? Math.max(1, trip?.members.length ?? 1), childrenAges: party?.childrenAges ?? [] };
    if (gap.kind === "stay") {
      const { summary, groups } = stayGroups(gap, people, itineraryItems);
      setSearch({ title: "Chercher un hébergement", summary, groups });
      return;
    }
    setSearch({ title: "Chercher un billet", summary: `${gap.from.name} → ${gap.to.name}`, groups: null });
    // Flight searches need the cities' IATA codes; ground searches do not.
    const [from, to] = await Promise.all([findCityCode(gap.from), findCityCode(gap.to)]);
    const { summary, groups } = journeyGroups(gap, people, { ...(from ? { from } : {}), ...(to ? { to } : {}) });
    setSearch({ title: "Chercher un billet", summary, groups });
  };
  const [tunnelRequested, setTunnelRequested] = useState(false);
  if (tunnelRequested && logistics) {
    setTunnelRequested(false);
    if (logistics.gaps.length > 0) setTunnelStart(logistics.gaps[0]!.key);
  }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<DashboardWeatherState>({ status: "loading" });
  const [weatherByStopId, setWeatherByStopId] = useState<Record<string, DashboardWeatherState>>({});
  const [routePolyline, setRoutePolyline] = useState<Coordinates[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({});
  const [offlineSnapshot, setOfflineSnapshot] = useState(false);
  const [offlineReady, setOfflineReady] = useState<boolean | undefined>(undefined);
  const [travelToNext, setTravelToNext] = useState<{ key: string; seconds: number } | null>(null);

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
    const { modules } = bootstrap;

    // The last offline download paints the screen at once; the network then refreshes it.
    const pack = await modules.offlineTripPack.get(tripId).catch(() => null);
    setOfflineReady(pack !== null);
    if (pack) {
      setTrip((current) => current ?? pack.trip);
      setStops((current) => (current.length > 0 ? current : pack.stops));
      setItineraryItems((current) => (current.length > 0 ? current : pack.itinerary));
      setReservations((current) => (current.length > 0 ? current : pack.reservations));
      setLoading(false);
    }

    setError(null);
    let nextStops: Stop[];
    try {
      const [nextTrip, loadedStops] = await Promise.all([
        trips.get(tripId),
        trips.listStops(tripId),
      ]);
      nextStops = loadedStops;
      setTrip(nextTrip);
      setStops(loadedStops);
      setOfflineSnapshot(false);
    } catch (cause: unknown) {
      setOfflineSnapshot(pack !== null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de charger le Voyage.",
      );
      setLoading(false);
      return;
    }
    setLoading(false);

    const itineraryTask = modules.itinerary.list(tripId).then(
      async (loadedItinerary) => {
        setItineraryItems(loadedItinerary);
        await loadRoute(nextStops, loadedItinerary);
        return loadedItinerary;
      },
      () => {
        setError(
          "Le Voyage et ses Étapes sont chargés, mais les lieux de la carte sont temporairement indisponibles.",
        );
        return [] as ItineraryItem[];
      },
    );

    await Promise.all([
      itineraryTask.then((loadedItinerary) => loadWeather(nextStops, loadedItinerary)),
      modules.reservations.list(tripId).then(setReservations, () => {
        setError("Le Voyage est chargé, mais les Réservations sont temporairement indisponibles.");
      }),
      // The departure city adds the outbound and return journeys to the logistics.
      Promise.all([
        modules.tripProfiles?.getDeparture(tripId).catch(() => null),
        modules.tripProfiles?.myProfile().catch(() => null),
      ]).then(([tripDeparture, profile]) => setDeparture(effectiveDeparture(tripDeparture, profile?.homeCity))),
      // Optional: before its migration, nothing is waived.
      (modules.logisticsWaivers?.list(tripId) ?? Promise.resolve([])).then(setWaivers, () => setWaivers([])),
      loadSummary(),
    ]);

    async function loadRoute(loadedStops: Stop[], loadedItinerary: ItineraryItem[]) {
      if (!modules.routing || !tripId) return setRoutePolyline([]);
      const routeCoordinates = dashboardRouteCoordinates(loadedStops, loadedItinerary);
      if (routeCoordinates.length < 2) return setRoutePolyline([]);
      try {
        const route = await modules.routing.calculate({ tripId, coordinates: routeCoordinates, mode: "drive" });
        setRoutePolyline(route?.geometry ?? []);
      } catch {
        setRoutePolyline([]);
      }
    }

    async function loadSummary() {
      if (!tripId) return;
      const [budget, packing] = await Promise.all([
        modules.expenses.summarize(tripId).catch(() => null),
        modules.packingList.list(tripId).catch(() => null),
      ]);
      setSummary({
        budget: budget
          ? {
              spent: formatCompactMoney(budget.spent),
              planned: budget.planned.minorUnits > 0 ? formatCompactMoney(budget.planned) : null,
              progress: budget.progress,
            }
          : null,
        packing: packing ? { packed: packing.filter((item) => item.packed).length, total: packing.length } : null,
      });
    }

    async function loadWeather(loadedStops: Stop[], loadedItinerary: ItineraryItem[]) {
      if (!tripId) return;
      const weatherEntries = await Promise.all(loadedStops.map(async (stop) => {
        const itineraryItem = loadedItinerary.find((item) => item.stopId === stop.id && item.place?.coordinates);
        let coordinates = itineraryItem?.place?.coordinates ?? stop.coordinates;
        if (!coordinates) {
          try {
            coordinates = (await modules.places.search({ query: stop.name, countryCode: stop.countryCode, stopId: stop.id, tripId })).at(0)?.coordinates;
          } catch {
            coordinates = undefined;
          }
        }
        if (!coordinates) return [stop.id, { status: "empty", message: "Étape sans coordonnées" } satisfies DashboardWeatherState] as const;
        try {
          const input = { coordinates, timeZone: stop.timeZone, startDate: stop.startDate, endDate: stop.endDate };
          const forecast = await modules.weather.forecast(input);
          const days = forecast.daily.filter((day) => day.date >= stop.startDate && day.date <= stop.endDate).map((day) => ({ date: day.date, label: formatWeatherDate(day.date, stop.timeZone), icon: weatherIcon(day.weatherCode), temperatureMin: day.temperatureMinC, temperatureMax: day.temperatureMaxC, precipitationProbabilityMax: day.precipitationProbabilityMax }));
          // Outside the 16-day forecast window, last year's observations give an idea of the climate.
          const climate = days.length === 0 ? await modules.weather.climate(input).catch(() => null) : null;
          return [stop.id, { status: "ready", updatedAt: forecast.fetchedAt, days, ...(climate ? { climate } : {}) }] as const;
        } catch (cause) {
          return [stop.id, { status: "error", message: cause instanceof Error ? cause.message : "Météo indisponible" } satisfies DashboardWeatherState] as const;
        }
      }));
      const weatherMap = Object.fromEntries(weatherEntries) as Record<string, DashboardWeatherState>;
      setWeatherByStopId(weatherMap);
      setWeather(loadedStops[0] ? weatherMap[loadedStops[0].id] ?? { status: "empty" } : { status: "empty", message: "Aucune Étape" });
    }
  }, [bootstrap, tripId, trips]);

  // While the Voyage is under way, the dashboard follows the local day of the current Étape.
  const today = useMemo(() => {
    if (!trip) return null;
    const timeZone = stops.find((stop) => {
      const date = localNow(stop.timeZone).slice(0, 10);
      return stop.startDate <= date && date <= stop.endDate;
    })?.timeZone ?? stops[0]?.timeZone;
    if (!timeZone) return null;
    return buildTodayPlan({ trip, stops, items: itineraryItems, reservations, now: localNow(timeZone) });
  }, [trip, stops, itineraryItems, reservations]);

  const nextCoordinates = today?.next?.item.place?.coordinates;
  const nextKey = nextCoordinates ? `${nextCoordinates.latitude},${nextCoordinates.longitude}` : null;
  // A duration computed for a previous "next" activity is never shown for the new one.
  const travelToNextSeconds = travelToNext && travelToNext.key === nextKey ? travelToNext.seconds : null;
  useEffect(() => {
    if (!nextCoordinates || !nextKey || !tripId || !bootstrap?.modules.routing) return;
    let active = true;
    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = await Location.getLastKnownPositionAsync();
        if (!position || !active) return;
        const route = await bootstrap.modules.routing?.calculate({
          tripId,
          mode: "walk",
          coordinates: [{ latitude: position.coords.latitude, longitude: position.coords.longitude }, nextCoordinates],
        });
        if (active && route?.durationSeconds != null) setTravelToNext({ key: nextKey, seconds: route.durationSeconds });
      } catch {
        // The "Y aller" button still works without a duration.
      }
    })();
    return () => {
      active = false;
    };
  }, [bootstrap, nextCoordinates, nextKey, tripId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      if (tripId && consumeLogisticsTunnel(tripId)) setTunnelRequested(true);
    }, [load, tripId]),
  );

  const routeTripId = rawTripId ?? "";

  return (
    <>
    <TripDashboardScreen
      trip={trip}
      stops={stops}
      itineraryItems={itineraryItems}
      reservations={reservations}
      loading={loading}
      error={error}
      onRefresh={load}
      onOpenTrips={() => router.replace("/(app)/trips")}
      onOpenSettings={() =>
        router.push(`/(app)/trips/${routeTripId}/settings`)
      }
      onOpenAssistant={() =>
        stops[0]
          ? router.push(
              `/trips/${routeTripId}/assistant?stopId=${stops[0].id}`,
            )
          : router.push(`/(app)/trips/${routeTripId}/stops/new`)
      }
      onComposeDay={() =>
        stops[0]
          ? router.push(`/trips/${routeTripId}/assistant?stopId=${stops[0].id}&mode=day`)
          : router.push(`/(app)/trips/${routeTripId}/stops/new`)
      }
      onOpenItinerary={() =>
        router.push(`/trips/${routeTripId}/itinerary`)
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
        router.push(`/trips/${routeTripId}/documents`)
      }
      onPlanB={(date) => {
        const stop = stops.find((candidate) => candidate.startDate <= date && date <= candidate.endDate) ?? stops[0];
        if (stop) router.push(planBAssistantPath(routeTripId, stop.id, date) as Href);
      }}
      onOpenQuestions={() => router.push(`/(app)/trips/${routeTripId}/ask`)}
      onOpenEmergency={() => router.push(`/(app)/trips/${routeTripId}/emergency`)}
      logistics={logistics}
      onOpenGap={(gap) => setTunnelStart(gap.key)}
      onOpenRecap={() => router.push(`/(app)/trips/${routeTripId}/recap`)}
      onOpenPacking={() =>
        router.push(`/(app)/trips/${routeTripId}/packing`)
      }
      weather={weather}
      weatherByStopId={weatherByStopId}
      routePolyline={routePolyline}
      today={today}
      travelToNextSeconds={travelToNextSeconds}
      onOpenDirections={(entry) => {
        const coordinates = entry.item.place?.coordinates;
        if (!coordinates) return;
        void Linking.openURL(
          `http://maps.apple.com/?daddr=${coordinates.latitude},${coordinates.longitude}&dirflg=w&q=${encodeURIComponent(entry.item.title)}`,
        );
      }}
      summary={summary}
      offlineSnapshot={offlineSnapshot}
      offlineReady={offlineReady}
    />
    <LogisticsTunnelSheet
      gaps={tunnelStart !== null && logistics ? logistics.gaps : null}
      startKey={tunnelStart ?? undefined}
      onSearch={(gap) => void openSearch(gap)}
      onImport={() => {
        setTunnelStart(null);
        router.push(`/(app)/trips/${routeTripId}/reservations`);
      }}
      onWaive={async (waiver) => {
        const module = bootstrap?.modules.logisticsWaivers;
        if (!module || !tripId) throw new Error("Indisponible pour le moment.");
        await module.add(tripId, waiver);
        setWaivers(await module.list(tripId));
      }}
      onClose={() => setTunnelStart(null)}
    />
    <PartnerSearchSheet
      visible={search !== null}
      title={search?.title ?? ""}
      summary={search?.summary ?? ""}
      groups={search?.groups ?? null}
      loading={search !== null && search.groups === null}
      onOpened={() => undefined}
      onClose={() => setSearch(null)}
    />
    </>
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

function formatCompactMoney(money: Money): string {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: money.currency, maximumFractionDigits: 0 }).format(money.minorUnits / 100);
  } catch {
    return `${Math.round(money.minorUnits / 100)} ${money.currency}`;
  }
}

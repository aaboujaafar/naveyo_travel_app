import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useNaveyoBootstrap } from "../../../../../src/bootstrap";
import type { ItineraryItem, PlaceCandidate, Stop, UUID } from "../../../../../src/modules/_shared/model";
import {
  confirmDayPlan,
  mapItineraryToDayPlanHistory,
  normalizeDayPlanPreferences,
  type DayPlanPreferences,
  type DayPlanDraft,
} from "../../../../../src/modules/day-planner";
import {
  useTripAssistant,
  type SuggestionDraft,
  type SuggestionItineraryContext,
  type SuggestionWeatherContext,
} from "../../../../../src/modules/trip-assistant";
import { useTripsModule } from "../../../../../src/modules/trips";
import { TripAssistantScreen } from "../../../../../src/screens/TripAssistantScreen";
import { DayPlanSection } from "../../../../../src/screens/DayPlanSection";
import { stopDates } from "../../../../../src/screens/day-plan-model";
import {
  assistantCategoryPlaceType,
  buildAssistantPreferences,
  type AssistantSearchValues,
} from "../../../../../src/screens/trip-assistant-model";

export default function TripAssistantRoute() {
  const router = useRouter();
  const { tripId, stopId } = useLocalSearchParams<{
    tripId: string;
    stopId: string;
  }>();
  const assistant = useTripAssistant();
  const bootstrap = useNaveyoBootstrap();
  const trips = useTripsModule();
  const [stop, setStop] = useState<Stop | null>(null);
  const [drafts, setDrafts] = useState<SuggestionDraft[]>([]);
  const [nearbyCandidates, setNearbyCandidates] = useState<PlaceCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [plannedItems, setPlannedItems] = useState<ItineraryItem[]>([]);
  const [weather, setWeather] = useState<SuggestionWeatherContext[]>([]);
  const [selectedDayPlanDate, setSelectedDayPlanDate] = useState("");
  const [dayPlan, setDayPlan] = useState<DayPlanDraft | null>(null);
  const [dayPlanError, setDayPlanError] = useState<string | null>(null);
  const [composingDay, setComposingDay] = useState(false);
  const [confirmingDay, setConfirmingDay] = useState(false);
  const [dayPlanPreferences, setDayPlanPreferences] = useState<DayPlanPreferences>({
    mobility: "walking",
    radiusMeters: 5_000,
    themes: ["mixed"],
    budget: "moderate",
    pace: "balanced",
  });

  const displayedPlannedItems = plannedItems.filter((item) => item.stopId === stop?.id);

  const handleDayPlanPreferencesChange = (preferences: DayPlanPreferences) => {
    setDayPlanPreferences(preferences);
    setNearbyCandidates([]);
    setDayPlan(null);
    setDayPlanError(null);
  };

  useEffect(() => {
    if (!trips || !tripId || !stopId) return;
    let active = true;
    trips
      .listStops(tripId as UUID)
      .then(async (stops) => {
        if (active) {
          const selected = stops.find((candidate) => candidate.id === stopId) ?? null;
          setStop(selected);
          if (selected) {
            setSelectedDayPlanDate(selected.startDate);
            setDayPlan(null);
            setDayPlanError(null);
          }
          if (!selected || !bootstrap) return;
          const items = await bootstrap.modules.itinerary.list(tripId as UUID);
          if (!active) return;
          setPlannedItems(items);
          let coordinates = selected.coordinates;
          if (!coordinates) coordinates = (await bootstrap.modules.places.search({ query: selected.name, tripId: tripId as UUID, stopId: selected.id, countryCode: selected.countryCode })).at(0)?.coordinates;
          if (!coordinates) return;
          try {
            const forecast = await bootstrap.modules.weather.forecast({ coordinates, timeZone: selected.timeZone, startDate: selected.startDate, endDate: selected.endDate });
            if (active) setWeather(forecast.daily.map((day) => ({ date: day.date, temperatureMinC: day.temperatureMinC, temperatureMaxC: day.temperatureMaxC, precipitationProbabilityMax: day.precipitationProbabilityMax, weatherCode: day.weatherCode })));
          } catch {
            if (active) setWeather([]);
          }
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger l’Étape",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [bootstrap, stopId, tripId, trips]);

  const discover = async (values: AssistantSearchValues) => {
    if (!tripId || !stopId) {
      setError("Le Voyage ou l’Étape est indisponible.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!bootstrap) throw new Error("Le Module Places est indisponible.");
      const radiusMeters = values.radiusMeters ?? 1_000;
      const type = assistantCategoryPlaceType(values.category);
      const candidates = stop?.coordinates
        ? await bootstrap.modules.places.nearby({ tripId: tripId as UUID, coordinates: stop.coordinates, radiusMeters, type, query: values.query.trim(), limit: 20 })
        : await bootstrap.modules.places.search({ query: values.query.trim(), countryCode: stop?.countryCode, stopId: stopId as UUID, tripId: tripId as UUID, type });
      setNearbyCandidates(candidates);
      const assistantQuery = values.query.trim() || values.category;
      if (assistant && assistantQuery.length >= 2) {
        const result = await assistant.suggestPlaces({
          tripId: tripId as UUID,
          stopId: stopId as UUID,
          query: assistantQuery,
          preferences: buildAssistantPreferences(values.category),
          placeSearch: stop?.coordinates ? { near: { ...stop.coordinates, radiusMeters }, type } : { type },
          stopName: stop?.name,
          countryCode: stop?.countryCode,
          timeZone: stop?.timeZone,
          weather,
          existingItinerary: displayedPlannedItems.map((item): SuggestionItineraryContext => ({ date: item.date, title: item.title, localTime: item.time?.local })),
        });
        setDrafts(result);
      } else setDrafts([]);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Suggestions indisponibles",
      );
    } finally {
      setLoading(false);
    }
  };

  const composeDay = async () => {
    if (!bootstrap?.modules.dayPlanner || !tripId || !stopId || !selectedDayPlanDate) {
      setDayPlanError("La composition de journée n’est pas disponible.");
      return;
    }
    setComposingDay(true);
    setDayPlanError(null);
    try {
      const preferences = normalizeDayPlanPreferences(dayPlanPreferences);
      const result = await bootstrap.modules.dayPlanner.composeDay({
        tripId: tripId as UUID,
        stopId: stopId as UUID,
        date: selectedDayPlanDate,
        preferences,
        weather: weather.filter((day) => day.date === selectedDayPlanDate),
        existingItinerary: mapItineraryToDayPlanHistory(plannedItems),
      });
      setNearbyCandidates(result.candidates);
      setDayPlan(result);
    } catch (cause: unknown) {
      setDayPlanError(cause instanceof Error ? cause.message : "Composition indisponible");
    } finally {
      setComposingDay(false);
    }
  };

  const confirmComposedDay = async () => {
    if (!bootstrap || !tripId || !stop || !dayPlan) return;
    setConfirmingDay(true);
    setDayPlanError(null);
    try {
      const draftCandidates = dayPlan.candidates;
      const candidates = await Promise.all(
        dayPlan.items.map(async (item) => {
          const visible = draftCandidates.find((candidate) => candidate.id === item.candidateId)
            ?? nearbyCandidates.find((candidate) => candidate.id === item.candidateId);
          if (visible) return visible;
          const resolved = await bootstrap.modules.places.getById(
            item.candidateId,
            tripId as UUID,
          );
          // The gateway resolves a stored row through its provider id. Keep the
          // persisted place UUID used by the AI draft for itinerary references.
          return resolved ? { ...resolved, id: item.candidateId } : null;
        }),
      );
      if (candidates.some((candidate) => candidate === null)) {
        throw new Error("Un lieu du brouillon n’est plus disponible.");
      }
      const added = await confirmDayPlan({
        draft: dayPlan,
        candidates: candidates as PlaceCandidate[],
        itinerary: bootstrap.modules.itinerary,
        timeZone: stop.timeZone,
      });
      setPlannedItems((current) => [...current, ...added]);
      setDayPlan(null);
      router.push(`/(app)/trips/${tripId}/itinerary`);
    } catch (cause: unknown) {
      setDayPlanError(cause instanceof Error ? cause.message : "Confirmation indisponible");
    } finally {
      setConfirmingDay(false);
    }
  };

  return (
    <TripAssistantScreen
      stopName={stop?.name}
      drafts={drafts}
      nearbyCandidates={nearbyCandidates}
      loading={loading}
      assistantAvailable={assistant !== null}
      error={error}
      onDiscover={discover}
      onOpenPlace={(placeId) => router.push(`/(app)/trips/${tripId}/places/${placeId}`)}
      onBack={() => router.back()}
      onOpenTrip={() => {
        if (tripId) router.replace(`/(app)/trips/${tripId}`);
        else router.back();
      }}
      planningContext={{ weather, plannedCount: displayedPlannedItems.length }}
      dayPlanSection={stop ? (
        <DayPlanSection
          dates={stopDates(stop.startDate, stop.endDate)}
          selectedDate={selectedDayPlanDate}
          preferences={dayPlanPreferences}
          onPreferencesChange={handleDayPlanPreferencesChange}
          draft={dayPlan}
          loading={composingDay}
          confirming={confirmingDay}
          error={dayPlanError}
          onSelectDate={(date) => {
            setSelectedDayPlanDate(date);
            setDayPlan(null);
            setDayPlanError(null);
          }}
          onCompose={composeDay}
          onConfirm={confirmComposedDay}
        />
      ) : undefined}
    />
  );
}

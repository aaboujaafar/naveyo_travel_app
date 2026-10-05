import { useRouter } from "expo-router";
import { useTripTabParams } from "../../../../../../src/ui/TripRouteContext";
import { useEffect, useState } from "react";
import { describePlacesError } from "../../../../../../src/screens/places-error";
import { useNaveyoBootstrap } from "../../../../../../src/bootstrap";
import type { ItineraryItem, PlaceCandidate, Stop, UUID } from "../../../../../../src/modules/_shared/model";
import {
  confirmDayPlan,
  mapItineraryToDayPlanHistory,
  normalizeDayPlanPreferences,
  type DayPlanPreferences,
  type DayPlanDraft,
} from "../../../../../../src/modules/day-planner";
import {
  useTripAssistant,
  type SuggestionDraft,
  type SuggestionItineraryContext,
  type SuggestionWeatherContext,
} from "../../../../../../src/modules/trip-assistant";
import { useTripsModule } from "../../../../../../src/modules/trips";
import { TripAssistantScreen } from "../../../../../../src/screens/TripAssistantScreen";
import { DayPlanSection } from "../../../../../../src/screens/DayPlanSection";
import { stopDates } from "../../../../../../src/screens/day-plan-model";
import { updateDayPlanPreferences } from "../../../../../../src/screens/day-plan-preferences-model";
import {
  assistantCategoryPlaceType,
  buildAssistantPreferences,
  type AssistantSearchValues,
} from "../../../../../../src/screens/trip-assistant-model";

export default function TripAssistantRoute() {
  const router = useRouter();
  const { tripId, stopId: requestedStopId, mode: requestedMode, date: requestedDate, indoor } = useTripTabParams<{
    tripId: string;
    stopId?: string;
    mode?: string;
    /** "YYYY-MM-DD": the day to compose, e.g. from a weather Plan B. */
    date?: string;
    /** "1" restricts the composed day to indoor places. */
    indoor?: string;
  }>();
  const assistant = useTripAssistant();
  const bootstrap = useNaveyoBootstrap();
  const trips = useTripsModule();
  const [stop, setStop] = useState<Stop | null>(null);
  // Opened from the tab bar there is no stopId: the first Étape is explored by default.
  const stopId = stop?.id ?? requestedStopId;
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

  // A Plan B link asks for indoor places once; the traveller can change it afterwards (adjusted during render).
  const planBKey = indoor === "1" ? requestedDate ?? "today" : undefined;
  const [appliedPlanB, setAppliedPlanB] = useState<string | undefined>();
  if (planBKey !== undefined && planBKey !== appliedPlanB) {
    setAppliedPlanB(planBKey);
    setDayPlanPreferences((current) => updateDayPlanPreferences(current, { constraints: { indoorOutdoor: "indoor" } }));
  }

  // The travelling party set in the Voyage settings presets the day planner (children, step-free access).
  useEffect(() => {
    const profiles = bootstrap?.modules.tripProfiles;
    if (!profiles || !tripId) return;
    let active = true;
    void profiles.getParty(tripId as UUID).then((party) => {
      if (!active || !party) return;
      const children = party.childrenAges.length > 0;
      const accessibility = party.stroller || party.reducedMobility;
      if (!children && !accessibility) return;
      setDayPlanPreferences((current) => updateDayPlanPreferences(current, {
        constraints: {
          ...(current.constraints?.children === undefined ? { children } : {}),
          ...(current.constraints?.accessibility === undefined ? { accessibility } : {}),
        },
      }));
    }, () => undefined);
    return () => {
      active = false;
    };
  }, [bootstrap, tripId]);

  const displayedPlannedItems = plannedItems.filter((item) => item.stopId === stop?.id);

  const handleDayPlanPreferencesChange = (preferences: DayPlanPreferences) => {
    setDayPlanPreferences(preferences);
    setNearbyCandidates([]);
    setDayPlan(null);
    setDayPlanError(null);
  };

  useEffect(() => {
    if (!trips || !tripId) return;
    let active = true;
    trips
      .listStops(tripId as UUID)
      .then(async (stops) => {
        if (active) {
          const selected = stops.find((candidate) => candidate.id === requestedStopId) ?? stops[0] ?? null;
          setStop(selected);
          if (selected) {
            setSelectedDayPlanDate(
              requestedDate && selected.startDate <= requestedDate && requestedDate <= selected.endDate ? requestedDate : selected.startDate,
            );
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
  }, [bootstrap, requestedDate, requestedStopId, tripId, trips]);

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
        // The places are already listed: an unavailable AI only hides its suggestions.
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
        }).catch(() => []);
        setDrafts(result);
      } else setDrafts([]);
    } catch (cause: unknown) {
      setError(describePlacesError(cause, "Suggestions indisponibles pour le moment."));
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
      bootstrap.modules.places.remember?.(result.candidates);
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
      router.push(`/trips/${tripId}/itinerary`);
    } catch (cause: unknown) {
      setDayPlanError(cause instanceof Error ? cause.message : "Confirmation indisponible");
    } finally {
      setConfirmingDay(false);
    }
  };

  return (
    <TripAssistantScreen
      stopName={stop?.name}
      requestedMode={requestedMode === "day" || requestedMode === "places" ? requestedMode : undefined}
      drafts={drafts}
      nearbyCandidates={nearbyCandidates}
      loading={loading}
      assistantAvailable={assistant !== null}
      error={error}
      onDiscover={discover}
      onOpenPlace={(placeId) => router.push(`/(app)/trips/${tripId}/places/${placeId}`)}
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

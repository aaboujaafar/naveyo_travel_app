import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import type { Stop, UUID } from "../../../../../src/modules/_shared/model";
import {
  useTripAssistant,
  type SuggestionDraft,
} from "../../../../../src/modules/trip-assistant";
import { useTripsModule } from "../../../../../src/modules/trips";
import { TripAssistantScreen } from "../../../../../src/screens/TripAssistantScreen";
import {
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
  const trips = useTripsModule();
  const [stop, setStop] = useState<Stop | null>(null);
  const [drafts, setDrafts] = useState<SuggestionDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trips || !tripId || !stopId) return;
    let active = true;
    trips
      .listStops(tripId as UUID)
      .then((stops) => {
        if (active) {
          setStop(stops.find((candidate) => candidate.id === stopId) ?? null);
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
  }, [stopId, tripId, trips]);

  const discover = async (values: AssistantSearchValues) => {
    if (!assistant || !tripId || !stopId) {
      setError("Le Module Suggestions IA est indisponible.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await assistant.suggestPlaces({
        tripId: tripId as UUID,
        stopId: stopId as UUID,
        query: values.query.trim(),
        preferences: buildAssistantPreferences(values.category),
      });
      setDrafts(result);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Suggestions indisponibles",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TripAssistantScreen
      stopName={stop?.name}
      drafts={drafts}
      loading={loading}
      assistantAvailable={assistant !== null}
      error={error}
      onDiscover={discover}
      onBack={() => router.back()}
      onOpenTrip={() => {
        if (tripId) router.replace(`/(app)/trips/${tripId}`);
        else router.back();
      }}
    />
  );
}

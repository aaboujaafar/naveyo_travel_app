import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import type { Trip } from "../../../../../src/modules/_shared/model";
import { useTripsModule } from "../../../../../src/modules/trips";
import { TripSettingsScreen } from "../../../../../src/screens/TripSettingsScreen";
import {
  normalizeTripSettings,
  type TripSettingsValues,
} from "../../../../../src/screens/trip-settings-model";

export default function TripSettingsRoute() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const trips = useTripsModule();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!trips || !tripId) return;
    let active = true;
    trips
      .get(tripId as Trip["id"])
      .then((loaded) => {
        if (active) setTrip(loaded);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger le Voyage",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [trips, tripId]);

  const updateTrip = async (values: TripSettingsValues) => {
    if (!trips || !tripId) {
      setError("Le Module Voyages est indisponible.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await trips.update(
        tripId as Trip["id"],
        normalizeTripSettings(values),
      );
      setTrip(updated);
      setMessage("Les informations du Voyage ont été mises à jour.");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Modification impossible",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <TripSettingsScreen
      key={trip?.id ?? "loading"}
      trip={trip}
      saving={saving}
      message={message}
      error={error}
      onBack={() => router.back()}
      onSave={updateTrip}
      onOpenInvitation={() => {
        if (tripId) router.push(`/(app)/trips/${tripId}/invite`);
      }}
    />
  );
}

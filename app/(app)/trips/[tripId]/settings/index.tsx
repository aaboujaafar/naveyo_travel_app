import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Input, ShellFrame, StatusPanel } from "../../../../../src/ui";
import { useTripsModule } from "../../../../../src/modules/trips";
import type { Trip } from "../../../../../src/modules/_shared/model";

export default function TripSettingsScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const trips = useTripsModule();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!trips || !tripId) return;
    void trips
      .get(tripId as Trip["id"])
      .then((loaded) => {
        if (loaded) {
          setTrip(loaded);
          setName(loaded.name);
          setStartsOn(loaded.startsOn ?? "");
          setEndsOn(loaded.endsOn ?? "");
        }
      })
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Impossible de charger le Voyage",
        ),
      );
  }, [trips, tripId]);
  const updateTrip = async () => {
    if (!trips || !tripId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await trips.update(tripId as Trip["id"], {
        name,
        startsOn: startsOn || undefined,
        endsOn: endsOn || undefined,
      });
      setTrip(updated);
      setMessage("Le Voyage a été enregistré.");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Modification impossible",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ShellFrame
      title="Réglages du Voyage"
      subtitle="Les mutations ordinaires sont désactivées hors connexion"
    >
      <Input
        label="Nom du Voyage"
        value={name}
        onChangeText={setName}
        placeholder="Portugal 2026"
      />
      <Input
        label="Date de début (AAAA-MM-JJ)"
        value={startsOn}
        onChangeText={setStartsOn}
        placeholder="2026-09-04"
      />
      <Input
        label="Date de fin (AAAA-MM-JJ)"
        value={endsOn}
        onChangeText={setEndsOn}
        placeholder="2026-09-12"
      />
      <Button
        fullWidth
        loading={saving}
        disabled={!trips || !trip || !name.trim()}
        onPress={() => void updateTrip()}
      >
        Enregistrer le Voyage
      </Button>
      <Button
        fullWidth
        variant="secondary"
        disabled={!tripId || !trips || saving}
        onPress={() => router.push(`/(app)/trips/${tripId}/invite`)}
      >
        Inviter un membre
      </Button>
      {message ? (
        <StatusPanel
          kind="info"
          title="Modification enregistrée"
          message={message}
        />
      ) : null}
      {error ? (
        <StatusPanel
          kind="error"
          title="Modification refusée"
          message={error}
        />
      ) : null}
      <Button fullWidth variant="secondary" onPress={() => router.back()}>
        Retour au Voyage
      </Button>
    </ShellFrame>
  );
}

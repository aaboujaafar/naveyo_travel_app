import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { InlineMessage, ShellFrame, Button } from "../../../../../../src/ui";
import { useTripsModule } from "../../../../../../src/modules/trips";
import type { Stop, UUID } from "../../../../../../src/modules/_shared/model";
import { StopLocationFormScreen } from "../../../../../../src/screens/StopLocationFormScreen";

export default function EditStopScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId?: string; stopId?: string }>();
  const tripId = params.tripId as UUID | undefined;
  const stopId = params.stopId as UUID | undefined;
  const trips = useTripsModule();
  const [stop, setStop] = useState<Stop | null>(null);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    if (!trips || !tripId || !stopId) return;
    void trips.listStops(tripId).then((items) => {
      const found = items.find((item) => item.id === stopId) ?? null;
      setStop(found);
      setError(found ? null : "Cette Étape n’existe plus ou n’est plus accessible.");
    }).catch(() => setError("Impossible de charger l’Étape. Vérifiez la connexion puis réessayez."));
  }, [stopId, tripId, trips]));
  if (error) return <ShellFrame title="Modifier l’Étape"><InlineMessage variant="error" title="Étape indisponible" message={error} /><Button onPress={() => router.back()}>Retour</Button></ShellFrame>;
  if (!tripId || !stopId || !stop) return <ShellFrame title="Modifier l’Étape"><InlineMessage title="Chargement" message="Chargement de la localisation…" /></ShellFrame>;
  return <StopLocationFormScreen tripId={tripId} initialStop={stop} onSaved={() => router.back()} onCancel={() => router.back()} />;
}

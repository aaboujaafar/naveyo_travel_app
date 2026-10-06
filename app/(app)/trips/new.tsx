import { useRouter } from "expo-router";
import { requestLogisticsTunnel } from "../../../src/screens/logistics-tunnel-store";
import { useState } from "react";
import { useTripsModule } from "../../../src/modules/trips";
import type { Trip } from "../../../src/modules/_shared/model";
import { CreateTripScreen } from "../../../src/screens/CreateTripScreen";
import type { CreateTripFormValues } from "../../../src/screens/create-trip-model";

export default function NewTripScreen() {
  const router = useRouter();
  const trips = useTripsModule();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (values: CreateTripFormValues) => {
    if (!trips) return;
    setSaving(true);
    setError(null);
    try {
      const trip = await trips.create({
        name: values.name.trim(),
        referenceCurrency: "EUR" as Trip["referenceCurrency"],
        startsOn: values.startsOn,
        endsOn: values.endsOn,
      });
      // The dashboard asks about stays and journeys on its first appearance.
      requestLogisticsTunnel(trip.id);
      router.replace(`/(app)/trips/${trip.id}/invite`);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de créer le Voyage",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <CreateTripScreen
      canSubmit={trips !== null}
      saving={saving}
      error={error}
      onBack={() => router.back()}
      onSubmit={submit}
    />
  );
}

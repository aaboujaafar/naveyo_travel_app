import { useLocalSearchParams, useRouter } from "expo-router";
import { StopLocationFormScreen } from "../../../../../src/screens/StopLocationFormScreen";
import type { UUID } from "../../../../../src/modules/_shared/model";
import { requestLogisticsTunnel } from "../../../../../src/screens/logistics-tunnel-store";

export default function NewStopScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return (
    <StopLocationFormScreen
      tripId={tripId as UUID}
      onSaved={() => {
        // Back on the dashboard, the new Étape's stay and journeys are asked about.
        if (tripId) requestLogisticsTunnel(tripId);
        router.back();
      }}
      onCancel={() => router.back()}
    />
  );
}

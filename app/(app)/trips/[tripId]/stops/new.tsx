import { useLocalSearchParams, useRouter } from "expo-router";
import { StopLocationFormScreen } from "../../../../../src/screens/StopLocationFormScreen";
import type { UUID } from "../../../../../src/modules/_shared/model";

export default function NewStopScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <StopLocationFormScreen tripId={tripId as UUID} onSaved={() => router.back()} onCancel={() => router.back()} />;
}

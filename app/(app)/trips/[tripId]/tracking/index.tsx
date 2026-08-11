import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useNaveyoBootstrap } from "../../../../../src/bootstrap";
import type {
  TrackPoint,
  TrackingStatus,
  UUID,
} from "../../../../../src/modules/_shared/model";
import { trackingErrorStatus } from "../../../../../src/modules/trip-tracking/tracking-screen-state";
import { TripTrackingScreen } from "../../../../../src/screens/TripTrackingScreen";

export default function TrackingRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const tripId = typeof rawTripId === "string" ? (rawTripId as UUID) : null;
  const bootstrap = useNaveyoBootstrap();
  const [status, setStatus] = useState<TrackingStatus>({ state: "stopped" });
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!bootstrap || !tripId) {
      setStatus(trackingErrorStatus(undefined, "Voyage introuvable"));
      return;
    }
    try {
      const [nextStatus, nextPoints] = await Promise.all([
        bootstrap.modules.tripTracking.tracker.getStatus(),
        bootstrap.modules.tripTracking.list(tripId),
      ]);
      setStatus(nextStatus);
      setPoints(nextPoints);
    } catch (cause: unknown) {
      setStatus(trackingErrorStatus(tripId, cause));
    }
  }, [bootstrap, tripId]);

  useEffect(() => {
    const timeout = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timeout);
  }, [refresh]);

  const toggleTracking = async () => {
    if (!bootstrap || !tripId || busy) return;
    setBusy(true);
    try {
      const nextStatus =
        status.state === "recording" && status.tripId === tripId
          ? await bootstrap.modules.tripTracking.tracker.stop()
          : await bootstrap.modules.tripTracking.tracker.start(tripId);
      setStatus(nextStatus);
      await refresh();
    } catch (cause: unknown) {
      setStatus(trackingErrorStatus(tripId, cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TripTrackingScreen
      tripId={tripId}
      status={status}
      points={points}
      busy={busy}
      onBack={() => router.back()}
      onToggle={toggleTracking}
      onRefresh={refresh}
    />
  );
}

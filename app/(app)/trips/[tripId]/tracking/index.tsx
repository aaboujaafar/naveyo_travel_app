import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text } from "react-native";
import type {
  TrackingStatus,
  UUID,
} from "../../../../../src/modules/_shared/model";
import { createExpoLocationTrackingModule } from "../../../../../src/adapters/expo-location";
import { Button, Card, ShellFrame, StatusPanel } from "../../../../../src/ui";
import {
  trackingButtonLabel,
  trackingErrorStatus,
  trackingStatusMessage,
  trackingStatusTitle,
} from "./tracking-screen-state";

const tracking = createExpoLocationTrackingModule();

export default function TrackingScreen() {
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const tripId = typeof rawTripId === "string" ? (rawTripId as UUID) : undefined;
  const [status, setStatus] = useState<TrackingStatus>({ state: "stopped" });
  const [pointCount, setPointCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!tripId) {
      setStatus(trackingErrorStatus(undefined, "Voyage introuvable"));
      return;
    }
    try {
      setStatus(await tracking.tracker.getStatus());
      setPointCount((await tracking.list(tripId)).length);
    } catch (cause: unknown) {
      setStatus(trackingErrorStatus(tripId, cause));
    }
  }, [tripId]);

  useEffect(() => {
    const timeout = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timeout);
  }, [refresh]);

  const message = useMemo(() => trackingStatusMessage(status), [status]);

  async function toggleTracking() {
    if (!tripId || busy) return;
    setBusy(true);
    try {
      const nextStatus =
        status.state === "recording"
          ? await tracking.tracker.stop()
          : await tracking.tracker.start(tripId);
      setStatus(nextStatus);
      await refresh();
    } catch (cause: unknown) {
      setStatus(trackingErrorStatus(tripId, cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ShellFrame
      title="Trace de trajet"
      subtitle="Un seul appareil enregistreur"
    >
      <Card>
        <StatusPanel
          kind={status.state === "error" ? "error" : "info"}
          title={trackingStatusTitle(status)}
          message={message}
        />
        <Text accessibilityLabel={`${pointCount} points enregistrés`}>
          {pointCount} point(s) enregistré(s) sur cet appareil
        </Text>
        <Button
          fullWidth
          loading={busy}
          disabled={!tripId || busy || status.state === "starting"}
          onPress={toggleTracking}
          accessibilityLabel={trackingButtonLabel(status)}
        >
          {trackingButtonLabel(status)}
        </Button>
      </Card>
      <StatusPanel
        kind="info"
        title="Limite de cette version"
        message="Les points restent locaux et seront synchronisés par l’intégration GPS. Un force-quit iOS peut interrompre le suivi en arrière-plan."
      />
    </ShellFrame>
  );
}

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useNaveyoBootstrap } from "../../../../../src/bootstrap";
import type { UUID } from "../../../../../src/modules/_shared/model";
import type { SavedTransitMap } from "../../../../../src/modules/transit-maps";
import { TransitMapViewerScreen } from "../../../../../src/screens/TransitMapViewerScreen";

export default function TransitMapViewerRoute() {
  const router = useRouter();
  const { tripId, networkId } = useLocalSearchParams<{ tripId: string; networkId: string }>();
  const bootstrap = useNaveyoBootstrap();
  const [map, setMap] = useState<SavedTransitMap | null>(null);

  useEffect(() => {
    if (!bootstrap?.modules.transitMaps || !tripId) return;
    let active = true;
    void bootstrap.modules.transitMaps.list(tripId as UUID).then((maps) => {
      if (active) setMap(maps.find((item) => item.networkId === networkId) ?? null);
    }, () => undefined);
    return () => {
      active = false;
    };
  }, [bootstrap, networkId, tripId]);

  return <TransitMapViewerScreen map={map} onBack={() => router.back()} />;
}

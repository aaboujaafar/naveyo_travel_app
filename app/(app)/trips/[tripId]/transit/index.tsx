import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useNaveyoBootstrap } from "../../../../../src/bootstrap";
import type { Coordinates, Stop, UUID } from "../../../../../src/modules/_shared/model";
import type { SavedTransitMap, TransitMapCandidate } from "../../../../../src/modules/transit-maps";
import { TransitMapsScreen, type TransitStopSection } from "../../../../../src/screens/TransitMapsScreen";

export default function TransitMapsRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const tripId = typeof rawTripId === "string" ? (rawTripId as UUID) : undefined;
  const bootstrap = useNaveyoBootstrap();
  const [sections, setSections] = useState<TransitStopSection[]>([]);
  const [saved, setSaved] = useState<SavedTransitMap[]>([]);
  const [downloading, setDownloading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const load = useCallback(async () => {
    const transit = bootstrap?.modules.transitMaps;
    if (!bootstrap || !transit || !tripId) return;
    setSaved(await transit.list(tripId).catch(() => []));
    let stops: readonly Stop[];
    try {
      stops = await bootstrap.modules.trips.listStops(tripId);
      setOnline(true);
    } catch {
      // Without network the Stops come from the offline download; no search is attempted.
      const pack = await bootstrap.modules.offlineTripPack.get(tripId).catch(() => null);
      setOnline(false);
      setSections((pack?.stops ?? []).map((stop) => ({ stop, candidates: [] })));
      return;
    }
    setSections(stops.map((stop) => ({ stop, candidates: null })));
    setError(null);
    await Promise.all(stops.map(async (stop) => {
      const update = (patch: Partial<TransitStopSection>) =>
        setSections((current) => current.map((section) => (section.stop.id === stop.id ? { ...section, ...patch } : section)));
      try {
        const coordinates: Coordinates | undefined = stop.coordinates
          ?? (await bootstrap.modules.places.search({ query: stop.name, tripId, stopId: stop.id, countryCode: stop.countryCode })).at(0)?.coordinates;
        if (!coordinates) return update({ candidates: [] });
        update({ candidates: await transit.find(coordinates) });
      } catch (cause) {
        update({ candidates: [], error: cause instanceof Error ? cause.message : "Recherche impossible." });
      }
    }));
  }, [bootstrap, tripId]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const download = async (stop: Stop, candidate: TransitMapCandidate) => {
    const transit = bootstrap?.modules.transitMaps;
    if (!transit || !tripId) return;
    setDownloading((current) => [...current, candidate.networkId]);
    setError(null);
    try {
      const map = await transit.download({ tripId, stopId: stop.id, candidate });
      setSaved((current) => [...current.filter((item) => item.networkId !== map.networkId), map]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Téléchargement impossible.");
    } finally {
      setDownloading((current) => current.filter((id) => id !== candidate.networkId));
    }
  };

  return (
    <TransitMapsScreen
      sections={sections}
      saved={saved}
      downloading={downloading}
      error={error}
      online={online}
      onDownload={(stop, candidate) => void download(stop, candidate)}
      onOpen={(map) => router.push(`/(app)/trips/${tripId}/transit/${map.networkId}`)}
      onRemove={(map) => Alert.alert("Supprimer ce plan ?", `${map.name} ne sera plus consultable sans réseau.`, [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            if (!tripId) return;
            void bootstrap?.modules.transitMaps?.remove(tripId, map.networkId).then(() => setSaved((current) => current.filter((item) => item.networkId !== map.networkId)));
          },
        },
      ])}
      onBack={() => router.back()}
    />
  );
}

import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useNaveyoBootstrap } from "../../../src/bootstrap";
import type { Trip } from "../../../src/modules/_shared/model";
import type { OfflineTripPackLoad } from "../../../src/modules/offline-trip-pack";
import { TripsListScreen } from "../../../src/screens/TripsListScreen";

export default function TripsIndexScreen() {
  const router = useRouter();
  const bootstrap = useNaveyoBootstrap();
  const [items, setItems] = useState<Trip[]>([]);
  const [packs, setPacks] = useState<Record<string, OfflineTripPackLoad>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!bootstrap) { setError("Les Modules de l’application ne sont pas disponibles."); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const trips = await bootstrap.modules.trips.list();
      setItems(trips);
      const nextPacks = await Promise.all(trips.map(async (trip) => [trip.id, await bootstrap.modules.offlineTripPack.load(trip.id)] as const));
      setPacks(Object.fromEntries(nextPacks));
    } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : "Impossible de charger les Voyages."); }
    finally { setLoading(false); }
  }, [bootstrap]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  return <TripsListScreen items={items} packs={packs} loading={loading} error={error} onRetry={load} onCreate={() => router.push("/(app)/trips/new")} onOpenTrip={(trip) => router.push(`/(app)/trips/${trip.id}`)} onOpenAccount={() => router.push("/(app)/account")} onOpenImports={() => router.push("/(app)/imports")} onJoinTrip={() => router.push("/(app)/invite")} />;
}

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useNaveyoBootstrap } from "../../../../src/bootstrap";
import type { UUID } from "../../../../src/modules/_shared/model";
import { EmergencyScreen } from "../../../../src/screens/EmergencyScreen";
import { buildEmergencySheet, type EmergencyCountry } from "../../../../src/screens/emergency-model";

export default function EmergencyRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const tripId = typeof rawTripId === "string" ? (rawTripId as UUID) : undefined;
  const bootstrap = useNaveyoBootstrap();
  const [countries, setCountries] = useState<EmergencyCountry[]>([]);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bootstrap || !tripId) return;
    const { modules } = bootstrap;
    let active = true;
    void (async () => {
      try {
        const [stops, reservations, waivers] = await Promise.all([
          modules.trips.listStops(tripId),
          modules.reservations.list(tripId).catch(() => []),
          modules.logisticsWaivers?.list(tripId).catch(() => []) ?? Promise.resolve([]),
        ]);
        const LABELS = { friends: "Chez des proches", camping: "Camping / van", other: "Hébergement" } as const;
        const otherStays = waivers.flatMap(({ waiver }) => {
          if (waiver.kind !== "stay" || !waiver.address) return [];
          const stop = stops.find((item) => item.id === waiver.stopId);
          return [{ stopId: waiver.stopId, label: `${LABELS[waiver.mode]}${stop ? ` à ${stop.name}` : ""}`, address: waiver.address }];
        });
        if (active) setCountries(buildEmergencySheet(stops, reservations, otherStays));
      } catch (cause) {
        // Without network, the last offline download has the Étapes and confirmed stays.
        const pack = await modules.offlineTripPack.get(tripId).catch(() => null);
        if (!active) return;
        if (pack) {
          setCountries(buildEmergencySheet(pack.stops, pack.reservations));
          setOffline(true);
        } else {
          setError(cause instanceof Error ? cause.message : "Impossible de charger le Voyage.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [bootstrap, tripId]);

  return <EmergencyScreen countries={countries} offline={offline} error={error} onBack={() => router.back()} />;
}

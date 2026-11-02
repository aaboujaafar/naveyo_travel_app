import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useNaveyoBootstrap } from "../../../../src/bootstrap";
import type { Money, UUID } from "../../../../src/modules/_shared/model";
import { TripQuestionsScreen } from "../../../../src/screens/TripQuestionsScreen";
import { answerTripQuestion, type TripQuestionData } from "../../../../src/screens/trip-questions-model";
import { localToday } from "../../../../src/screens/trips-list-model";

export default function TripQuestionsRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const tripId = typeof rawTripId === "string" ? (rawTripId as UUID) : undefined;
  const bootstrap = useNaveyoBootstrap();
  const [data, setData] = useState<TripQuestionData | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bootstrap || !tripId) return;
    const { modules } = bootstrap;
    let active = true;
    void (async () => {
      try {
        const [trip, stops, itinerary, reservations, summary, packing] = await Promise.all([
          modules.trips.get(tripId),
          modules.trips.listStops(tripId),
          modules.itinerary.list(tripId),
          modules.reservations.list(tripId).catch(() => []),
          modules.expenses.summarize(tripId).catch(() => null),
          modules.packingList.list(tripId).catch(() => null),
        ]);
        if (!active) return;
        if (!trip) throw new Error("Ce Voyage n’est plus accessible.");
        setData({
          trip,
          stops,
          itinerary,
          reservations,
          budget: summary ? { spent: money(summary.spent), planned: summary.planned.minorUnits > 0 ? money(summary.planned) : null } : null,
          packing: packing ? packing.map((item) => ({ label: item.label, packed: item.packed })) : null,
        });
        setOffline(false);
      } catch (cause) {
        // Without network the last offline download still answers most questions.
        const pack = await modules.offlineTripPack.get(tripId).catch(() => null);
        if (!active) return;
        if (pack) {
          setData({ trip: pack.trip, stops: pack.stops, itinerary: pack.itinerary, reservations: pack.reservations, budget: null, packing: null });
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

  return (
    <TripQuestionsScreen
      tripName={data?.trip.name ?? "Voyage"}
      offline={offline}
      ready={data !== null}
      error={error}
      onAsk={(question) => answerTripQuestion(question, data ?? { trip: { name: "" }, stops: [], itinerary: [], reservations: [] }, localToday())}
      onBack={() => router.back()}
    />
  );
}

function money(value: Money): string {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: value.currency, maximumFractionDigits: 0 }).format(value.minorUnits / 100);
  } catch {
    return `${Math.round(value.minorUnits / 100)} ${value.currency}`;
  }
}

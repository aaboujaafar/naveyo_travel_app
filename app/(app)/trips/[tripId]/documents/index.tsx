import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import type { TravelDocument, UUID } from "../../../../../src/modules/_shared/model";
import { useDocuments } from "../../../../../src/modules/documents";
import { useTripsModule } from "../../../../../src/modules/trips";
import {
  TripDocumentsScreen,
  type DocumentFilter,
  type DocumentStopOption,
} from "../../../../../src/screens/TripDocumentsScreen";

export default function DocumentsRoute() {
  const router = useRouter();
  const { tripId: rawTripId, stopId: rawStopId } = useLocalSearchParams<{
    tripId: string;
    stopId?: string;
  }>();
  const tripId = rawTripId as UUID | undefined;
  const documents = useDocuments();
  const trips = useTripsModule();
  const [tripName, setTripName] = useState("Voyage");
  const [items, setItems] = useState<TravelDocument[]>([]);
  const [stops, setStops] = useState<DocumentStopOption[]>([]);
  const [filter, setFilter] = useState<DocumentFilter>(
    rawStopId ? (rawStopId as UUID) : "all",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId || !documents || !trips) {
      setError("Les Modules Documents et Trips doivent être disponibles.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [trip, nextStops] = await Promise.all([
        trips.get(tripId),
        trips.listStops(tripId),
      ]);
      setTripName(trip?.name ?? "Voyage");
      setStops(nextStops.map(({ id, name }) => ({ id, name })));
      if (filter === "unclassified" && documents.listUnclassified) {
        setItems(await documents.listUnclassified(tripId));
      } else {
        setItems(await documents.list(tripId, filter === "all" || filter === "unclassified" ? undefined : filter));
      }
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger les Documents de voyage.");
    } finally {
      setLoading(false);
    }
  }, [documents, filter, tripId, trips]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function download(document: TravelDocument) {
    if (!documents || !tripId) return;
    setError(null);
    try {
      await documents.download(tripId, document.id);
      setDownloadedId(document.id);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible de télécharger le Document.");
    }
  }

  async function assign(document: TravelDocument, stopId?: UUID) {
    if (!documents?.assign || !tripId) return;
    setError(null);
    try {
      await documents.assign(tripId, document.id, stopId);
      await load();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible de déplacer le Document.");
    }
  }

  const routeTripId = rawTripId ?? "";

  return (
    <TripDocumentsScreen
      tripName={tripName}
      items={items}
      stops={stops}
      filter={filter}
      loading={loading}
      error={error}
      downloadedId={downloadedId}
      canAssign={documents?.assign !== undefined}
      onBack={() => router.back()}
      onRetry={load}
      onSelectFilter={setFilter}
      onDownload={download}
      onAssign={assign}
      onOpenReservations={() => router.replace(`/(app)/trips/${routeTripId}/reservations`)}
      onOpenPacking={() => router.replace(`/(app)/trips/${routeTripId}/packing`)}
      onImport={() => router.push(`/(app)/imports?tripId=${routeTripId}`)}
    />
  );
}

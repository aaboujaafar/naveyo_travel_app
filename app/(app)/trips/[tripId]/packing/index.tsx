import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import type {
  AddPackingItemInput,
  PackingItem,
  UpdatePackingItemInput,
} from "../../../../../src/modules/packing-list";
import type { Stop, Trip, UUID } from "../../../../../src/modules/_shared/model";
import { usePackingList } from "../../../../../src/modules/packing-list/context";
import { useTripsModule } from "../../../../../src/modules/trips";
import {
  TripPackingScreen,
} from "../../../../../src/screens/TripPackingScreen";

type AddPackingItem = Omit<AddPackingItemInput, "tripId">;

interface PackingScreenProps {
  tripName: string;
  items: PackingItem[];
  stops: Stop[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  onBack: () => void;
  onOpenDocuments: () => void;
  onOpenReservations: () => void;
  onRetry: () => Promise<void>;
  onAddItem: (input: AddPackingItem) => Promise<boolean>;
  onTogglePacked: (item: PackingItem, packed: boolean) => Promise<void>;
  onRemoveItem: (item: PackingItem) => Promise<void>;
}

export default function PackingRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const tripId = typeof rawTripId === "string" ? (rawTripId as UUID) : undefined;
  const trips = useTripsModule();
  const packingList = usePackingList();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [items, setItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!tripId || !trips || !packingList) {
      setError("La liste de bagages n’est pas disponible.");
      setLoading(false);
      return;
    }
    // Silent refreshes keep the list on screen after each change instead of flashing skeletons.
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const [nextTrip, nextStops, nextItems] = await Promise.all([
        trips.get(tripId),
        trips.listStops(tripId),
        packingList.list(tripId),
      ]);
      setTrip(nextTrip);
      setStops(nextStops);
      setItems(nextItems);
    } catch (cause: unknown) {
      setError(describePackingError(cause, "Impossible de charger la liste de bagages."));
    } finally {
      setLoading(false);
    }
  }, [packingList, tripId, trips]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const runMutation = useCallback(async (mutation: () => Promise<void>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      await mutation();
      return true;
    } catch (cause: unknown) {
      setError(describePackingError(cause, "Impossible de modifier la liste de bagages."));
      return false;
    } finally {
      await load({ silent: true });
      setSaving(false);
    }
  }, [load]);

  const add = useCallback((input: AddPackingItem) => {
    if (!packingList || !tripId) return Promise.resolve(false);
    return runMutation(async () => {
      await packingList.add({ ...input, tripId });
    });
  }, [packingList, runMutation, tripId]);

  const update = useCallback(async (itemId: UUID, changes: UpdatePackingItemInput) => {
    if (!packingList || !tripId) return;
    // Optimistic toggle: the checkbox reacts immediately, the silent refresh reconciles.
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, ...changes, stopId: changes.stopId === null ? undefined : changes.stopId ?? item.stopId, assignedTo: changes.assignedTo === null ? undefined : changes.assignedTo ?? item.assignedTo } : item));
    await runMutation(async () => {
      await packingList.update(tripId, itemId, changes);
    });
  }, [packingList, runMutation, tripId]);

  const remove = useCallback(async (itemId: UUID) => {
    if (!packingList || !tripId) return;
    setItems((current) => current.filter((item) => item.id !== itemId));
    await runMutation(() => packingList.remove(tripId, itemId));
  }, [packingList, runMutation, tripId]);

  const props: PackingScreenProps = {
    tripName: trip?.name ?? "Voyage",
    items,
    stops,
    loading,
    saving,
    error,
    onBack: () => router.back(),
    onOpenDocuments: () => router.replace(`/(app)/trips/${rawTripId ?? ""}/documents`),
    onOpenReservations: () => router.replace(`/(app)/trips/${rawTripId ?? ""}/reservations`),
    onRetry: () => load(),
    onAddItem: add,
    onTogglePacked: (item, packed) => update(item.id, { packed }),
    onRemoveItem: (item) => remove(item.id),
  };

  return <TripPackingScreen {...props} />;
}

function describePackingError(cause: unknown, fallback: string): string {
  const message = cause instanceof Error ? cause.message : "";
  if (/not available|42501/i.test(message)) return "Cet élément n’est plus disponible ou vous n’avez pas le droit de le modifier.";
  if (/quantity/i.test(message)) return "La quantité doit être comprise entre 1 et 99.";
  if (/label is too long/i.test(message)) return "Le nom de l’élément est trop long (160 caractères maximum).";
  if (/label is required/i.test(message)) return "Indiquez le nom de l’élément.";
  if (/stop does not belong/i.test(message)) return "Cette Étape n’appartient plus au Voyage.";
  if (/network|fetch|timed out/i.test(message)) return "Connexion indisponible. Vérifiez le réseau puis réessayez.";
  return fallback;
}

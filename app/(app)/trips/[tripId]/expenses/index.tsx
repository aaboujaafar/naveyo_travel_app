import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useMemo, useState } from "react";
import { useNaveyoBootstrap } from "../../../../../src/bootstrap";
import type { BudgetSummary, Expense } from "../../../../../src/modules/expenses";
import type { ISO4217, Trip, UUID } from "../../../../../src/modules/_shared/model";
import { useTripsModule } from "../../../../../src/modules/trips";
import { TripBudgetScreen, type AddExpenseForm } from "../../../../../src/screens/TripBudgetScreen";
import { budgetAlerts, computeSharing } from "../../../../../src/screens/budget-sharing-model";
import { parseReceiptText } from "../../../../../src/screens/receipt-model";
import { localToday } from "../../../../../src/screens/trips-list-model";

const fallbackCurrency = "EUR" as ISO4217;

export default function ExpensesRoute() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const tripId = rawTripId as UUID | undefined;
  const bootstrap = useNaveyoBootstrap();
  const trips = useTripsModule();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<UUID | null>(null);

  const load = useCallback(async () => {
    if (!tripId || !trips) {
      setError("Le Voyage n'est pas disponible.");
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [nextTrip, account] = await Promise.all([
        trips.get(tripId),
        bootstrap?.modules.identity.currentAccount().catch(() => null) ?? Promise.resolve(null),
      ]);
      setTrip(nextTrip);
      setAccountId(account?.id ?? null);
      if (!bootstrap) {
        setError("Le Module Dépenses n'est pas encore exposé par la composition de l'application.");
        return;
      }
      const [nextSummary, nextExpenses] = await Promise.all([
        bootstrap.modules.expenses.summarize(tripId),
        bootstrap.modules.expenses.list(tripId),
      ]);
      setSummary(nextSummary);
      setExpenses(nextExpenses);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger le Budget global.");
    } finally {
      setLoading(false);
    }
  }, [bootstrap, tripId, trips]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function saveBudget(minorUnits: number) {
    if (!bootstrap || !tripId) return;
    setSaving(true);
    setError(null);
    try {
      await bootstrap.modules.expenses.setBudget(tripId, {
        minorUnits,
        currency: trip?.referenceCurrency ?? fallbackCurrency,
      });
      await load();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible d'enregistrer le Budget global.");
    } finally {
      setSaving(false);
    }
  }

  async function addExpense(input: AddExpenseForm) {
    if (!bootstrap || !tripId) return;
    setSaving(true);
    setError(null);
    try {
      await bootstrap.modules.expenses.add({
        tripId,
        label: input.label,
        category: input.category,
        original: { minorUnits: input.amountMinorUnits, currency: input.currency },
        occurredOn: input.occurredOn,
        paidBy: input.paidBy as UUID | undefined,
      });
      await load();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible d'ajouter la Dépense.");
    } finally {
      setSaving(false);
    }
  }

  // Members have no display name yet: "Vous" for this account, then the same numbering as the settings.
  const members = useMemo(() => {
    const ids = trip?.members.map((member) => member.accountId) ?? [];
    const labelled = ids.map((id, index) => ({ id, label: id === accountId ? "Vous" : `Compte ${index + 1}` }));
    return [...labelled.filter((member) => member.id === accountId), ...labelled.filter((member) => member.id !== accountId)];
  }, [accountId, trip]);
  const sharing = useMemo(() => (members.length > 1 ? computeSharing(expenses, members.map((member) => member.id)) : null), [expenses, members]);
  const alerts = useMemo(
    () => budgetAlerts({ summary, startsOn: trip?.startsOn, endsOn: trip?.endsOn, today: localToday() }),
    [summary, trip],
  );

  return (
    <TripBudgetScreen
      onScanReceipt={bootstrap?.modules.reservationTextExtractor ? async (source) => {
        const extractor = bootstrap.modules.reservationTextExtractor;
        if (!extractor) return null;
        if (source === "camera") {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) throw new Error("Autorisez l’appareil photo dans Réglages › Naveyo pour scanner un ticket.");
        }
        const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.9 };
        const picked = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
        const uri = picked.canceled ? undefined : picked.assets[0]?.uri;
        if (!uri) return null;
        // Vision reads the text on the iPhone; nothing leaves the device.
        const text = await extractor.extract(uri).catch((cause: unknown) => {
          const reason = cause instanceof Error ? cause.message : String(cause);
          // "No text" is an ordinary unreadable photo; anything else is worth showing.
          if (/no text could be extracted/i.test(reason)) return "";
          throw new Error(`Le ticket n’a pas pu être lu sur l’iPhone (${reason}).`);
        });
        return parseReceiptText(text, { defaultCurrency: trip?.referenceCurrency ?? fallbackCurrency });
      } : undefined}
      members={members}
      sharing={sharing}
      alerts={alerts}
      tripName={trip?.name ?? "Voyage"}
      referenceCurrency={trip?.referenceCurrency ?? fallbackCurrency}
      summary={summary}
      expenses={expenses}
      loading={loading}
      saving={saving}
      error={error}
      onBack={() => router.back()}
      onRetry={load}
      onSaveBudget={saveBudget}
      onAddExpense={addExpense}
    />
  );
}

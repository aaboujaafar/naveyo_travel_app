import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useNaveyoBootstrap } from "../../../../../src/bootstrap";
import type { BudgetSummary, Expense } from "../../../../../src/modules/expenses";
import type { ISO4217, Trip, UUID } from "../../../../../src/modules/_shared/model";
import { useTripsModule } from "../../../../../src/modules/trips";
import { TripBudgetScreen, type AddExpenseForm } from "../../../../../src/screens/TripBudgetScreen";

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

  const load = useCallback(async () => {
    if (!tripId || !trips) {
      setError("Le Voyage n'est pas disponible.");
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setTrip(await trips.get(tripId));
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

  return (
    <TripBudgetScreen
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

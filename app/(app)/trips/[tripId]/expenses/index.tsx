import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FakeExchangeRateProvider } from "../../../../../src/adapters/exchange-rates/fake";
import {
  Expenses,
  InMemoryExpensesStore,
  type ExpenseCategory,
} from "../../../../../src/modules/expenses";
import type { ISO4217 } from "../../../../../src/modules/_shared/model";
import { uuid } from "../../../../../src/modules/_shared/fake";
import {
  Button,
  Card,
  Input,
  ProgressBar,
  ShellFrame,
  StatusPanel,
} from "../../../../../src/ui";
import { colors } from "../../../../../src/theme/colors";
import { spacing } from "../../../../../src/theme/spacing";
import { typography } from "../../../../../src/theme/typography";

const referenceCurrency = "EUR" as ISO4217;
const defaultTripId = "00000000-0000-4000-8000-000000000001";

export default function ExpensesScreen() {
  const params = useLocalSearchParams<{ tripId: string }>();
  const tripId = uuid(
    typeof params.tripId === "string" ? params.tripId : defaultTripId,
  );
  const module = useMemo(
    () =>
      new Expenses(new InMemoryExpensesStore(), new FakeExchangeRateProvider()),
    [],
  );
  const [budgetMinorUnits, setBudgetMinorUnits] = useState("");
  const [label, setLabel] = useState("");
  const [amountMinorUnits, setAmountMinorUnits] = useState("");
  const [currency, setCurrency] = useState<ISO4217>(referenceCurrency);
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [note, setNote] = useState("");
  const [payer, setPayer] = useState("");
  const [date, setDate] = useState("2026-08-04");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] =
    useState<Awaited<ReturnType<Expenses["summarize"]>>>(null);

  useEffect(() => {
    void module
      .setBudget(tripId, { minorUnits: 0, currency: referenceCurrency })
      .then(() => module.summarize(tripId).then(setSummary));
  }, [module, tripId]);

  const saveBudget = async () => {
    try {
      setError(null);
      await module.setBudget(tripId, {
        minorUnits: Number(budgetMinorUnits),
        currency: referenceCurrency,
      });
      setSummary(await module.summarize(tripId));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Impossible d’enregistrer le budget",
      );
    }
  };

  const addExpense = async () => {
    try {
      setError(null);
      await module.add({
        tripId,
        label,
        category,
        note: note || undefined,
        original: { minorUnits: Number(amountMinorUnits), currency },
        occurredOn: date,
        paidBy: payer ? uuid(payer) : undefined,
      });
      setLabel("");
      setAmountMinorUnits("");
      setNote("");
      setPayer("");
      setSummary(await module.summarize(tripId));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Impossible d’ajouter la dépense",
      );
    }
  };

  return (
    <ShellFrame
      title="Budget et dépenses"
      subtitle="Montants suivis dans la devise de référence du Voyage."
    >
      {error ? (
        <StatusPanel kind="error" title="Action impossible" message={error} />
      ) : null}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Budget global · EUR</Text>
        <Input
          label="Budget en centimes"
          value={budgetMinorUnits}
          onChangeText={setBudgetMinorUnits}
          keyboardType="number-pad"
          placeholder="100000"
          hint="Exemple : 100000 = 1 000,00 EUR"
        />
        <Button onPress={() => void saveBudget()} fullWidth>
          Enregistrer le budget
        </Button>
      </Card>

      {summary ? (
        <Card style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Dépensé</Text>
            <Text style={styles.value}>
              {formatMoney(summary.spent.minorUnits)} EUR
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Restant</Text>
            <Text style={styles.value}>
              {formatMoney(summary.remaining.minorUnits)} EUR
            </Text>
          </View>
          <ProgressBar progress={summary.progress} color="teal" />
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Ajouter une dépense</Text>
        <Input
          label="Libellé"
          value={label}
          onChangeText={setLabel}
          placeholder="Billets de train"
        />
        <Input
          label="Montant en unité mineure"
          value={amountMinorUnits}
          onChangeText={setAmountMinorUnits}
          keyboardType="number-pad"
          placeholder="2500"
        />
        <Input
          label="Devise ISO 4217"
          value={currency}
          onChangeText={(value) => setCurrency(value as ISO4217)}
          autoCapitalize="characters"
          maxLength={3}
        />
        <Input
          label="Catégorie"
          value={category}
          onChangeText={(value) => setCategory(value as ExpenseCategory)}
          placeholder="transport, food, ..."
        />
        <Input
          label="Date locale"
          value={date}
          onChangeText={setDate}
          placeholder="AAAA-MM-JJ"
        />
        <Input
          label="Note (facultatif)"
          value={note}
          onChangeText={setNote}
          placeholder="Détail utile"
        />
        <Input
          label="Payé par (UUID facultatif)"
          value={payer}
          onChangeText={setPayer}
          placeholder="Compte du payeur"
        />
        <Button onPress={() => void addExpense()} fullWidth>
          Ajouter la dépense
        </Button>
      </Card>
    </ShellFrame>
  );
}

const formatMoney = (minorUnits: number): string =>
  (minorUnits / 100).toFixed(2).replace(".", ",");

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.fg },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  label: { ...typography.bodySmall, color: colors.muted },
  value: { ...typography.label, color: colors.fg },
});

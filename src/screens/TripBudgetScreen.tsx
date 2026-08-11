import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { BudgetSummary, Expense, ExpenseCategory } from "../modules/expenses";
import type { ISO4217 } from "../modules/_shared/model";
import { colors, layout, radius, shadows, spacing, zIndex } from "../theme";
import { AppText, Badge, BottomSheet, Button, Icon, InlineMessage, Input, ProgressBar, SectionTitle, Skeleton } from "../ui";
import { expenseCategories, expenseCategoryLabels, formatExpenseDate, formatMoney, summarizeExpenseCategories } from "./trip-budget-model";

export interface AddExpenseForm {
  label: string;
  amountMinorUnits: number;
  currency: ISO4217;
  category: ExpenseCategory;
  occurredOn: string;
  paidBy?: string;
}

export interface TripBudgetScreenProps {
  tripName: string;
  referenceCurrency: ISO4217;
  summary: BudgetSummary | null;
  expenses: Expense[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  onBack: () => void;
  onRetry: () => Promise<void>;
  onSaveBudget: (minorUnits: number) => Promise<void>;
  onAddExpense: (input: AddExpenseForm) => Promise<void>;
}

export function TripBudgetScreen(props: TripBudgetScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<ExpenseCategory | "all">("all");
  const [budgetValue, setBudgetValue] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(props.referenceCurrency);
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [date, setDate] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const categories = useMemo(() => summarizeExpenseCategories(props.expenses), [props.expenses]);
  const visibleExpenses = filter === "all" ? props.expenses : props.expenses.filter((expense) => expense.category === filter);

  if (props.loading && !props.summary) return <BudgetLoading />;

  async function saveBudget() {
    await props.onSaveBudget(Number(budgetValue));
    setBudgetValue("");
  }

  async function addExpense() {
    await props.onAddExpense({
      label,
      amountMinorUnits: Number(amount),
      currency: currency.toUpperCase() as ISO4217,
      category,
      occurredOn: date,
      paidBy: paidBy.trim() || undefined,
    });
    setLabel("");
    setAmount("");
    setPaidBy("");
    setModalVisible(false);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={props.onBack} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><Icon name="arrow-left" size={20} /></Pressable>
          <View style={styles.flexOne}><AppText variant="h2">Budget du Voyage</AppText><AppText variant="caption" color="muted">{props.tripName}</AppText></View>
        </View>

        {props.error ? <View style={styles.horizontal}><InlineMessage variant="error" title="Action impossible" message={props.error} /><Button variant="secondary" onPress={() => void props.onRetry()}>Réessayer</Button></View> : null}

        {props.summary ? (
          <View style={[styles.overview, shadows.md]}>
            <MoneyRow label="Budget global" value={formatMoney(props.summary.planned)} />
            <MoneyRow label="Dépensé" value={formatMoney(props.summary.spent)} />
            <ProgressBar progress={Math.min(Math.max(props.summary.progress, 0), 1)} color="accent" />
            <View style={styles.stats}><Stat label="Restant" value={formatMoney(props.summary.remaining)} success /><Stat label="Dépenses" value={String(props.expenses.length)} /><Stat label="Devise" value={props.summary.planned.currency} /></View>
          </View>
        ) : (
          <View style={[styles.overview, shadows.md]}>
            <AppText variant="h3">Définir le Budget global</AppText>
            <Input label={`Montant en unité mineure · ${props.referenceCurrency}`} value={budgetValue} onChangeText={setBudgetValue} keyboardType="number-pad" placeholder="100000" hint="100000 correspond à 1 000,00" />
            <Button fullWidth loading={props.saving} onPress={() => void saveBudget()}>Enregistrer le budget</Button>
          </View>
        )}

        <Section title="Répartition par catégorie">
          {categories.map((item) => (
            <View key={item.category} style={styles.categoryRow}>
              <View style={styles.categoryInfo}><AppText variant="label">{expenseCategoryLabels[item.category]}</AppText><AppText variant="caption" color="muted">{formatMoney({ minorUnits: item.minorUnits, currency: props.referenceCurrency })}</AppText></View>
              <View style={styles.categoryProgress}><ProgressBar progress={item.share} color={item.category === "food" ? "teal" : item.category === "activity" ? "gold" : "accent"} /></View>
              <AppText variant="caption" color="muted">{Math.round(item.share * 100)}%</AppText>
            </View>
          ))}
        </Section>

        <ComingSoon label="Répartition et règlements">
          <Section title="Qui paie quoi">
            <View style={styles.futureCard}><AppText variant="label">Répartition entre Voyageurs</AppText><AppText variant="bodySmall" color="muted">{"Aucune dette, créance ou proposition de règlement n'est calculée en V0."}</AppText></View>
          </Section>
        </ComingSoon>

        <ComingSoon label="Alertes par enveloppe">
          <Section title="Alertes budget">
            <View style={styles.alert}><AppText variant="bodySmall" color="gold">⚠️ Alertes par catégorie à venir</AppText></View>
          </Section>
        </ComingSoon>

        <Section title="Dépenses récentes">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            <FilterChip label="Tout" active={filter === "all"} onPress={() => setFilter("all")} />
            {expenseCategories.map((value) => <FilterChip key={value} label={expenseCategoryLabels[value]} active={filter === value} onPress={() => setFilter(value)} />)}
          </ScrollView>
          <View style={styles.expenseList}>
            {visibleExpenses.length === 0 ? <InlineMessage title="Aucune Dépense" message="Ajoutez une Dépense réelle pour commencer le suivi." /> : visibleExpenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} />)}
          </View>
        </Section>
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel="Ajouter une Dépense" onPress={() => setModalVisible(true)} style={({ pressed }) => [styles.fab, shadows.lg, pressed && styles.pressed]}><Icon name="plus" size={24} color={colors.white} /></Pressable>

      <BottomSheet visible={modalVisible} onClose={() => setModalVisible(false)} title="Nouvelle Dépense" maxHeight={720}>
        <Input label="Titre" value={label} onChangeText={setLabel} placeholder="Dîner au restaurant" />
        <Input label="Montant en unité mineure" value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="2500" />
        <Input label="Devise ISO 4217" value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} />
        <AppText variant="label">Catégorie</AppText>
        <View style={styles.categoryPicker}>{expenseCategories.map((value) => <FilterChip key={value} label={expenseCategoryLabels[value]} active={category === value} onPress={() => setCategory(value)} />)}</View>
        <Input label="Date locale" value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
        <Input label="Payé par · UUID facultatif" value={paidBy} onChangeText={setPaidBy} placeholder="Compte ayant payé" />
        <ComingSoon label="Justificatif photo"><View style={styles.receiptButton}><Icon name="image" size={20} color={colors.muted} /><AppText variant="label" color="muted">Ajouter un reçu</AppText></View></ComingSoon>
        {props.error ? <InlineMessage variant="error" title="Ajout impossible" message={props.error} /> : null}
        <Button fullWidth loading={props.saving} onPress={() => void addExpense()}>Ajouter la Dépense</Button>
      </BottomSheet>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><SectionTitle title={title} />{children}</View>; }
function MoneyRow({ label, value }: { label: string; value: string }) { return <View style={styles.moneyRow}><AppText variant="bodySmall" color="muted">{label}</AppText><AppText variant="h2">{value}</AppText></View>; }
function Stat({ label, value, success }: { label: string; value: string; success?: boolean }) { return <View style={styles.stat}><AppText variant="label" color={success ? "success" : "fg"} align="center">{value}</AppText><AppText variant="caption" color="muted" align="center">{label}</AppText></View>; }
function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}><AppText variant="caption" color={active ? "accent" : "muted"}>{label}</AppText></Pressable>; }
function ExpenseRow({ expense }: { expense: Expense }) { return <View style={styles.expenseRow}><View style={styles.expenseIcon}><AppText variant="h3">{expense.category === "food" ? "🍽" : expense.category === "transport" ? "🚗" : expense.category === "accommodation" ? "🏨" : "🎫"}</AppText></View><View style={styles.flexOne}><AppText variant="label" numberOfLines={1}>{expense.label}</AppText><AppText variant="caption" color="muted">{formatExpenseDate(expense.occurredOn)}</AppText></View><View style={styles.amount}><AppText variant="label">{formatMoney(expense.original)}</AppText>{expense.original.currency !== expense.reference.currency ? <AppText variant="caption" color="muted">{formatMoney(expense.reference)}</AppText> : null}</View></View>; }
function ComingSoon({ label, children }: { label: string; children: React.ReactNode }) { return <View accessibilityLabel={`${label}, à venir`} accessibilityState={{ disabled: true }} style={styles.futureWrap}><View pointerEvents="none" style={styles.futureContent}>{children}</View><Badge label="À venir" variant="gold" style={styles.futureBadge} /></View>; }
function BudgetLoading() { return <View style={styles.loading}><Skeleton height={spacing["2xl"]} /><Skeleton height={spacing["2xl"] * 4} /><Skeleton height={spacing["2xl"] * 5} /></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, scrollContent: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingBottom: spacing["2xl"] * 3 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg }, iconButton: { width: spacing["2xl"] - spacing.xs, height: spacing["2xl"] - spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  horizontal: { paddingHorizontal: spacing.lg, gap: spacing.sm }, overview: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, gap: spacing.md }, moneyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: spacing.sm }, stats: { flexDirection: "row", gap: spacing.sm }, stat: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg, borderRadius: radius.sm, gap: spacing.xs },
  section: { marginHorizontal: spacing.lg, marginTop: spacing.lg }, categoryRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm }, categoryInfo: { width: "30%" }, categoryProgress: { flex: 1 }, futureCard: { padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, gap: spacing.xs }, alert: { padding: spacing.md, backgroundColor: colors.goldSoft, borderRadius: radius.sm },
  filters: { gap: spacing.sm, paddingBottom: spacing.sm }, chip: { minHeight: spacing["2xl"] - spacing.xs, paddingHorizontal: spacing.md - spacing.xs, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, chipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft }, expenseList: { gap: spacing.sm, marginTop: spacing.md }, expenseRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, expenseIcon: { width: spacing["2xl"] - spacing.xs, height: spacing["2xl"] - spacing.xs, borderRadius: radius.sm, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" }, amount: { alignItems: "flex-end" },
  fab: { position: "absolute", right: spacing.lg, bottom: spacing.lg, width: spacing["2xl"] + spacing.sm, height: spacing["2xl"] + spacing.sm, borderRadius: radius.full, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", zIndex: zIndex.fab }, categoryPicker: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, receiptButton: { minHeight: spacing["2xl"], borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.border, borderRadius: radius.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  futureWrap: { position: "relative" }, futureContent: { opacity: 0.5 }, futureBadge: { position: "absolute", top: spacing.xs, right: spacing.lg, zIndex: zIndex.sticky }, flexOne: { flex: 1 }, pressed: { transform: [{ scale: 0.97 }] }, loading: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bg },
});

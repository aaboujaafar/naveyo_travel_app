import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BudgetSummary, Expense, ExpenseCategory } from "../modules/expenses";
import type { ISO4217, UUID } from "../modules/_shared/model";
import type { BudgetAlert, Settlement, SharingSummary } from "./budget-sharing-model";
import { formatAmountInput, type ReceiptDraft } from "./receipt-model";
import { colors, layout, radius, shadows, spacing, zIndex } from "../theme";
import { AppText, BottomSheet, Button, DatePickerField, Icon, InlineMessage, Input, ProgressBar, SectionTitle, Skeleton } from "../ui";
import { expenseCategories, expenseCategoryLabels, formatExpenseDate, formatMoney, parseMoneyInput, summarizeExpenseCategories } from "./trip-budget-model";

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
  /** Members who can pay; the current account comes first and is labelled "Vous". */
  members?: { id: UUID; label: string }[];
  sharing?: SharingSummary | null;
  /** Transfers already made; undefined hides the « Réglé » buttons (no repayments module). */
  repayments?: { id: UUID; from: UUID; to: UUID; minorUnits: number }[];
  repaymentError?: string | null;
  onSettle?: (settlement: Settlement) => Promise<void>;
  onCancelRepayment?: (repaymentId: UUID) => Promise<void>;
  alerts?: BudgetAlert[];
  /** Reads a receipt photo on the iPhone; null when the traveller cancels. */
  onScanReceipt?: (source: "camera" | "library") => Promise<ReceiptDraft | null>;
}

export function TripBudgetScreen(props: TripBudgetScreenProps) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<ExpenseCategory | "all">("all");
  const [budgetValue, setBudgetValue] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(props.referenceCurrency);
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [date, setDate] = useState("");
  const [paidBy, setPaidBy] = useState<UUID | undefined>(props.members?.[0]?.id);
  const payer = paidBy ?? props.members?.[0]?.id;
  const memberLabel = (id: UUID) => props.members?.find((member) => member.id === id)?.label ?? "Membre";
  const [settling, setSettling] = useState<string | null>(null);
  const settle = async (settlement: Settlement) => {
    if (!props.onSettle) return;
    setSettling(`${settlement.from}-${settlement.to}`);
    try {
      await props.onSettle(settlement);
    } finally {
      setSettling(null);
    }
  };
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<{ ok: boolean; message: string } | null>(null);

  async function scanReceipt(source: "camera" | "library") {
    if (!props.onScanReceipt) return;
    setScanning(true);
    setScanNote(null);
    try {
      const draft = await props.onScanReceipt(source);
      if (!draft) return;
      if (draft.merchant) setLabel(draft.merchant);
      if (draft.amountMinorUnits) setAmount(formatAmountInput(draft.amountMinorUnits));
      if (draft.currency) setCurrency(draft.currency);
      if (draft.category) setCategory(draft.category);
      if (draft.occurredOn) setDate(draft.occurredOn);
      const found = [draft.amountMinorUnits ? "montant" : null, draft.occurredOn ? "date" : null, draft.merchant ? "commerçant" : null].filter(Boolean);
      setScanNote(found.length > 0
        ? { ok: true, message: `Pré-rempli depuis le ticket (${found.join(", ")}). Vérifiez avant d’ajouter.` }
        : { ok: false, message: "Le ticket n’a pas pu être lu. Saisissez la dépense à la main." });
    } catch (cause) {
      setScanNote({ ok: false, message: cause instanceof Error ? cause.message : "Lecture du ticket impossible." });
    } finally {
      setScanning(false);
    }
  }
  const categories = useMemo(() => summarizeExpenseCategories(props.expenses), [props.expenses]);
  const visibleExpenses = filter === "all" ? props.expenses : props.expenses.filter((expense) => expense.category === filter);

  if (props.loading && !props.summary) return <BudgetLoading />;

  const budgetMinorUnits = parseMoneyInput(budgetValue);
  const amountMinorUnits = parseMoneyInput(amount);

  async function saveBudget() {
    if (budgetMinorUnits === null) return;
    await props.onSaveBudget(budgetMinorUnits);
    setBudgetValue("");
  }

  async function addExpense() {
    if (amountMinorUnits === null) return;
    await props.onAddExpense({
      label,
      amountMinorUnits,
      currency: currency.toUpperCase() as ISO4217,
      category,
      occurredOn: date,
      paidBy: payer,
    });
    setLabel("");
    setAmount("");
    setScanNote(null);
    setModalVisible(false);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
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
            <Input label={`Budget total · ${props.referenceCurrency}`} value={budgetValue} onChangeText={setBudgetValue} keyboardType="decimal-pad" placeholder="1 000" hint={budgetMinorUnits !== null ? `Soit ${formatMoney({ minorUnits: budgetMinorUnits, currency: props.referenceCurrency })}` : "Montant pour tout le Voyage"} />
            <Button fullWidth loading={props.saving} disabled={budgetMinorUnits === null} onPress={() => void saveBudget()}>Enregistrer le budget</Button>
          </View>
        )}

        {props.expenses.length > 0 ? <Section title="Répartition par catégorie">
          {categories.map((item) => (
            <View key={item.category} style={styles.categoryRow}>
              <View style={styles.categoryInfo}><AppText variant="label">{expenseCategoryLabels[item.category]}</AppText><AppText variant="caption" color="muted">{formatMoney({ minorUnits: item.minorUnits, currency: props.referenceCurrency })}</AppText></View>
              <View style={styles.categoryProgress}><ProgressBar progress={item.share} color={item.category === "food" ? "teal" : item.category === "activity" ? "gold" : "accent"} /></View>
              <AppText variant="caption" color="muted">{Math.round(item.share * 100)}%</AppText>
            </View>
          ))}
        </Section> : null}

        {props.alerts && props.alerts.length > 0 ? (
          <Section title="Alertes budget">
            <View style={styles.alertList}>
              {props.alerts.map((alert) => <InlineMessage key={alert.title} variant={alert.level === "danger" ? "error" : "info"} title={alert.title} message={alert.message} />)}
            </View>
          </Section>
        ) : null}

        {props.members && props.members.length > 1 && props.sharing ? (
          <Section title="Qui paie quoi">
            <View style={styles.futureCard}>
              {props.sharing.balances.map((balance) => (
                <View key={balance.accountId} style={styles.balanceRow}>
                  <View style={styles.flexOne}>
                    <AppText variant="label">{memberLabel(balance.accountId)}</AppText>
                    <AppText variant="caption" color="muted">{`A payé ${formatMoney({ minorUnits: balance.paidMinorUnits, currency: props.referenceCurrency })}`}</AppText>
                  </View>
                  <AppText variant="label" color={balance.balanceMinorUnits > 0 ? "success" : balance.balanceMinorUnits < 0 ? "accent" : "muted"}>
                    {balance.balanceMinorUnits === 0 ? "À l’équilibre" : `${balance.balanceMinorUnits > 0 ? "+" : "−"}${formatMoney({ minorUnits: Math.abs(balance.balanceMinorUnits), currency: props.referenceCurrency })}`}
                  </AppText>
                </View>
              ))}
              {props.sharing.settlements.length > 0 ? (
                <View style={styles.settlements}>
                  <AppText variant="caption" color="muted">Pour équilibrer</AppText>
                  {props.sharing.settlements.map((settlement) => (
                    <View key={`${settlement.from}-${settlement.to}`} style={styles.balanceRow}>
                      <AppText variant="bodySmall" style={styles.flexOne}>
                        {`${memberLabel(settlement.from)} → ${memberLabel(settlement.to)} : ${formatMoney({ minorUnits: settlement.minorUnits, currency: props.referenceCurrency })}`}
                      </AppText>
                      {props.onSettle ? (
                        <Button size="sm" variant="secondary" loading={settling === `${settlement.from}-${settlement.to}`} onPress={() => void settle(settlement)} icon={<Icon name="check" size={14} />}>Réglé</Button>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : props.repayments && props.repayments.length > 0 ? (
                <AppText variant="bodySmall" color="success">Tout est réglé entre vous.</AppText>
              ) : null}
              {props.repaymentError ? <InlineMessage variant="error" title="Remboursement impossible" message={props.repaymentError} /> : null}
              {props.repayments && props.repayments.length > 0 ? (
                <View style={styles.settlements}>
                  <AppText variant="caption" color="muted">Déjà remboursé</AppText>
                  {props.repayments.map((repayment) => (
                    <View key={repayment.id} style={styles.balanceRow}>
                      <AppText variant="caption" color="muted" style={styles.flexOne}>
                        {`${memberLabel(repayment.from)} → ${memberLabel(repayment.to)} : ${formatMoney({ minorUnits: repayment.minorUnits, currency: props.referenceCurrency })}`}
                      </AppText>
                      {props.onCancelRepayment ? (
                        <Pressable accessibilityRole="button" accessibilityLabel="Annuler ce remboursement" onPress={() => void props.onCancelRepayment?.(repayment.id)} hitSlop={8}>
                          <AppText variant="caption" color="teal">Annuler</AppText>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
              {props.sharing.unassignedCount > 0 ? (
                <AppText variant="caption" color="muted">{`${props.sharing.unassignedCount} dépense${props.sharing.unassignedCount > 1 ? "s" : ""} sans payeur ${props.sharing.unassignedCount > 1 ? "ne sont pas réparties" : "n’est pas répartie"}.`}</AppText>
              ) : null}
            </View>
          </Section>
        ) : null}

        <Section title="Dépenses récentes">
          {props.expenses.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            <FilterChip label="Tout" active={filter === "all"} onPress={() => setFilter("all")} />
            {expenseCategories.map((value) => <FilterChip key={value} label={expenseCategoryLabels[value]} active={filter === value} onPress={() => setFilter(value)} />)}
          </ScrollView> : null}
          <View style={styles.expenseList}>
            {visibleExpenses.length === 0 ? <AppText variant="bodySmall" color="muted">Aucune dépense pour l’instant. Touchez « + » pour ajouter la première.</AppText> : visibleExpenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} payerLabel={props.members && props.members.length > 1 && expense.paidBy ? memberLabel(expense.paidBy) : undefined} />)}
          </View>
        </Section>
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel="Ajouter une Dépense" onPress={() => setModalVisible(true)} style={({ pressed }) => [styles.fab, shadows.lg, pressed && styles.pressed]}><Icon name="plus" size={24} color={colors.white} /></Pressable>

      <BottomSheet visible={modalVisible} onClose={() => setModalVisible(false)} title="Nouvelle Dépense" maxHeight={720}>
        {props.onScanReceipt ? (
          <View style={styles.scanRow}>
            <Button size="sm" variant="secondary" style={styles.flexOne} loading={scanning} onPress={() => void scanReceipt("camera")} icon={<Icon name="image" size={16} color={colors.fg} />}>Photographier un ticket</Button>
            <Button size="sm" variant="ghost" disabled={scanning} onPress={() => void scanReceipt("library")}>Depuis Photos</Button>
          </View>
        ) : null}
        {scanNote ? <InlineMessage variant={scanNote.ok ? "info" : "error"} title={scanNote.ok ? "Ticket lu sur l’iPhone" : "Lecture incomplète"} message={scanNote.message} /> : null}
        <Input label="Titre" value={label} onChangeText={setLabel} placeholder="Dîner au restaurant" />
        <Input label="Montant" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="25,00" />
        <Input label="Devise" value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} hint="Code à 3 lettres : EUR, USD, GBP…" />
        <AppText variant="label">Catégorie</AppText>
        <View style={styles.categoryPicker}>{expenseCategories.map((value) => <FilterChip key={value} label={expenseCategoryLabels[value]} active={category === value} onPress={() => setCategory(value)} />)}</View>
        <DatePickerField label="Date locale" value={date} onChange={setDate} />
        {props.members && props.members.length > 1 ? (
          <>
            <AppText variant="label">Payé par</AppText>
            <View style={styles.categoryPicker}>{props.members.map((member) => <FilterChip key={member.id} label={member.label} active={payer === member.id} onPress={() => setPaidBy(member.id)} />)}</View>
          </>
        ) : null}
        <ComingSoon label="Justificatif photo"><View style={styles.receiptButton}><Icon name="image" size={20} color={colors.muted} /><AppText variant="label" color="muted">Ajouter un reçu</AppText></View></ComingSoon>
        {props.error ? <InlineMessage variant="error" title="Ajout impossible" message={props.error} /> : null}
        <Button fullWidth loading={props.saving} disabled={!label.trim() || amountMinorUnits === null || !date} onPress={() => void addExpense()}>Ajouter la Dépense</Button>
      </BottomSheet>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><SectionTitle title={title} />{children}</View>; }
function MoneyRow({ label, value }: { label: string; value: string }) { return <View style={styles.moneyRow}><AppText variant="bodySmall" color="muted">{label}</AppText><AppText variant="h2">{value}</AppText></View>; }
function Stat({ label, value, success }: { label: string; value: string; success?: boolean }) { return <View style={styles.stat}><AppText variant="label" color={success ? "success" : "fg"} align="center">{value}</AppText><AppText variant="caption" color="muted" align="center">{label}</AppText></View>; }
function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}><AppText variant="caption" color={active ? "accent" : "muted"}>{label}</AppText></Pressable>; }
function ExpenseRow({ expense, payerLabel }: { expense: Expense; payerLabel?: string }) { return <View style={styles.expenseRow}><View style={styles.expenseIcon}><AppText variant="h3">{expense.category === "food" ? "🍽" : expense.category === "transport" ? "🚗" : expense.category === "accommodation" ? "🏨" : "🎫"}</AppText></View><View style={styles.flexOne}><AppText variant="label" numberOfLines={1}>{expense.label}</AppText><AppText variant="caption" color="muted">{[formatExpenseDate(expense.occurredOn), payerLabel ? `payé par ${payerLabel === "Vous" ? "vous" : payerLabel}` : null].filter(Boolean).join(" · ")}</AppText></View><View style={styles.amount}><AppText variant="label">{formatMoney(expense.original)}</AppText>{expense.original.currency !== expense.reference.currency ? <AppText variant="caption" color="muted">{formatMoney(expense.reference)}</AppText> : null}</View></View>; }
function ComingSoon({ label, children }: { label: string; children: React.ReactNode }) { void label; void children; return null; }
function BudgetLoading() { return <View style={styles.loading}><Skeleton height={spacing["2xl"]} /><Skeleton height={spacing["2xl"] * 4} /><Skeleton height={spacing["2xl"] * 5} /></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, scrollContent: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingBottom: spacing["2xl"] * 3 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg }, iconButton: { width: spacing["2xl"] - spacing.xs, height: spacing["2xl"] - spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  horizontal: { paddingHorizontal: spacing.lg, gap: spacing.sm }, overview: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, gap: spacing.md }, moneyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: spacing.sm }, stats: { flexDirection: "row", gap: spacing.sm }, stat: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg, borderRadius: radius.sm, gap: spacing.xs },
  section: { marginHorizontal: spacing.lg, marginTop: spacing.lg }, categoryRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm }, categoryInfo: { width: "30%" }, categoryProgress: { flex: 1 }, futureCard: { padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, gap: spacing.xs }, alertList: { gap: spacing.sm }, scanRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, balanceRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs }, settlements: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  filters: { gap: spacing.sm, paddingBottom: spacing.sm }, chip: { minHeight: spacing["2xl"] - spacing.xs, paddingHorizontal: spacing.md - spacing.xs, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, chipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft }, expenseList: { gap: spacing.sm, marginTop: spacing.md }, expenseRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, expenseIcon: { width: spacing["2xl"] - spacing.xs, height: spacing["2xl"] - spacing.xs, borderRadius: radius.sm, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" }, amount: { alignItems: "flex-end" },
  fab: { position: "absolute", right: spacing.lg, bottom: spacing.lg, width: spacing["2xl"] + spacing.sm, height: spacing["2xl"] + spacing.sm, borderRadius: radius.full, backgroundColor: colors.accentStrong, alignItems: "center", justifyContent: "center", zIndex: zIndex.fab }, categoryPicker: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, receiptButton: { minHeight: spacing["2xl"], borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.border, borderRadius: radius.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  futureWrap: { position: "relative" }, futureContent: { opacity: 0.5 }, futureBadge: { position: "absolute", top: spacing.xs, right: spacing.lg, zIndex: zIndex.sticky }, flexOne: { flex: 1 }, pressed: { transform: [{ scale: 0.97 }] }, loading: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bg },
});

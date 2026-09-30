import { useMemo, useState } from "react";
import { Keyboard, Modal, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radius, spacing } from "../theme";
import { AppText } from "./AppText";
import { Icon } from "./Icon";

export interface DatePickerFieldProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  minimumDate?: string;
  maximumDate?: string;
  testID?: string;
  containerStyle?: ViewStyle;
}

const WEEKDAYS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const SHORT_MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function DatePickerField({ label, value, onChange, error, placeholder = "Choisir une date", minimumDate, maximumDate, testID, containerStyle }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthFromDate(initialMonthDate(value, minimumDate, maximumDate)));
  const monthDays = useMemo(() => buildMonthDays(visibleMonth.year, visibleMonth.month), [visibleMonth]);

  const todayAllowed = isAllowed(isoToday(), minimumDate, maximumDate);

  const openPicker = () => {
    // A text field keeping focus would reopen the keyboard when the sheet closes.
    Keyboard.dismiss();
    setVisibleMonth(monthFromDate(initialMonthDate(value, minimumDate, maximumDate)));
    setOpen(true);
  };

  return <View style={[styles.container, containerStyle]} testID={testID}>
    <AppText variant="label">{label}</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Ouvre le calendrier" onPress={openPicker} style={({ pressed }) => [styles.field, error && styles.fieldError, pressed && styles.pressed]}>
      <AppText variant="body" color={value ? "fg" : "muted"} numberOfLines={1} style={styles.fieldText}>{value ? formatShortDate(value) : placeholder}</AppText>
      <Icon name="calendar" size={20} color={colors.muted} />
    </Pressable>
    {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}><View><AppText variant="h3">{label}</AppText><AppText variant="caption" color="muted">Sélectionnez une date</AppText></View><Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setOpen(false)} style={styles.close}><Icon name="close" size={20} /></Pressable></View>
          <View style={styles.monthHeader}><Pressable accessibilityRole="button" accessibilityLabel="Mois précédent" onPress={() => setVisibleMonth(previousMonth(visibleMonth))} style={styles.arrow}><Icon name="arrow-left" size={20} /></Pressable><AppText variant="label" align="center">{MONTHS[visibleMonth.month]} {visibleMonth.year}</AppText><Pressable accessibilityRole="button" accessibilityLabel="Mois suivant" onPress={() => setVisibleMonth(nextMonth(visibleMonth))} style={styles.arrow}><Icon name="arrow-right" size={20} /></Pressable></View>
          <View style={styles.weekRow}>{WEEKDAYS.map((day) => <AppText key={day} variant="caption" color="muted" align="center" style={styles.dayCell}>{day}</AppText>)}</View>
          <View style={styles.grid}>{monthDays.map((day, index) => day ? <Pressable key={`${day}-${index}`} disabled={!isAllowed(day, minimumDate, maximumDate)} accessibilityRole="button" accessibilityLabel={formatDate(day)} accessibilityState={{ selected: day === value, disabled: !isAllowed(day, minimumDate, maximumDate) }} onPress={() => { onChange(day); setOpen(false); }} style={[styles.dayCell, styles.dayButton, day === value && styles.selectedDay, !isAllowed(day, minimumDate, maximumDate) && styles.disabledDay]}><AppText variant="bodySmall" align="center" color={day === value ? "onAccent" : isAllowed(day, minimumDate, maximumDate) ? "fg" : "muted"}>{Number(day.slice(-2))}</AppText></Pressable> : <View key={`empty-${index}`} style={styles.dayCell} />)}</View>
          {todayAllowed ? <Pressable accessibilityRole="button" accessibilityLabel="Choisir aujourd’hui" onPress={() => { onChange(isoToday()); setOpen(false); }} style={styles.today}><AppText variant="label" color="accent" align="center">Aujourd’hui</AppText></Pressable> : null}
        </View>
      </View>
    </Modal>
  </View>;
}

function isoToday() { const d = new Date(); return toIso(d.getFullYear(), d.getMonth(), d.getDate()); }
function toIso(year: number, month: number, day: number) { return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
function parseIso(value: string) { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); return match ? { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) } : null; }
function monthFromDate(value: string) { const parsed = parseIso(value) ?? parseIso(isoToday())!; return { year: parsed.year, month: parsed.month }; }
function buildMonthDays(year: number, month: number) { const first = new Date(year, month, 1).getDay(); const offset = (first + 6) % 7; const count = new Date(year, month + 1, 0).getDate(); return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => toIso(year, month, index + 1))] as (string | null)[]; }
function previousMonth(value: { year: number; month: number }) { return value.month === 0 ? { year: value.year - 1, month: 11 } : { year: value.year, month: value.month - 1 }; }
function nextMonth(value: { year: number; month: number }) { return value.month === 11 ? { year: value.year + 1, month: 0 } : { year: value.year, month: value.month + 1 }; }
function isAllowed(value: string, minimum?: string, maximum?: string) { return (!minimum || value >= minimum) && (!maximum || value <= maximum); }
/** Opens on the chosen day, else on the first selectable day, never on a fully disabled month. */
function initialMonthDate(value?: string, minimum?: string, maximum?: string) {
  if (value) return value;
  const today = isoToday();
  if (minimum && today < minimum) return minimum;
  if (maximum && today > maximum) return maximum;
  return today;
}
function formatShortDate(value: string) { const parsed = parseIso(value); return parsed ? `${parsed.day} ${SHORT_MONTHS[parsed.month]} ${parsed.year}` : value; }
function formatDate(value: string) { const parsed = parseIso(value); return parsed ? `${parsed.day} ${MONTHS[parsed.month]} ${parsed.year}` : value; }

const styles = StyleSheet.create({
  container: { gap: 6 }, field: { minHeight: 56, paddingHorizontal: spacing.md, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }, fieldText: { flex: 1 }, fieldError: { borderColor: colors.danger }, pressed: { opacity: 0.78 }, backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" }, modal: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing["2xl"] }, modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }, close: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }, monthHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }, arrow: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }, weekRow: { flexDirection: "row", marginBottom: spacing.xs }, grid: { flexDirection: "row", flexWrap: "wrap" }, dayCell: { width: "14.2857%", minHeight: 44, alignItems: "center", justifyContent: "center" }, dayButton: { borderRadius: radius.full }, selectedDay: { backgroundColor: colors.accentStrong }, disabledDay: { opacity: 0.45 }, today: { marginTop: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});

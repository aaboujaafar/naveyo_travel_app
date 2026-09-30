import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import type {
  DayPlanBudget,
  DayPlanDraft,
  DayPlanItemDraft,
  DayPlanMobility,
  DayPlanPace,
  DayPlanPreferences,
  DayPlanTheme,
} from "../modules/day-planner";
import { AppText, Badge, Button, Checkbox, Chip, Icon, InlineMessage, Input } from "../ui";
import { colors, layout, radius, spacing } from "../theme";
import {
  formatDayPlanDate,
  formatDayPlanDuration,
  formatPriceLevel,
  formatRating,
  formatStraightLineDistance,
  sortedDayPlanItems,
} from "./day-plan-model";
import {
  DEFAULT_DAY_PLAN_PREFERENCES,
  toggleDayPlanTheme,
  updateDayPlanPreferences,
} from "./day-plan-preferences-model";

export type {
  DayPlanBudget,
  DayPlanConstraints,
  DayPlanIndoorOutdoor,
  DayPlanMobility,
  DayPlanPace,
  DayPlanPreferences,
  DayPlanTheme,
} from "../modules/day-planner";
export type { DayPlanPreferencesChange } from "./day-plan-preferences-model";

export interface DayPlanSectionProps {
  dates: string[];
  selectedDate: string;
  draft: DayPlanDraft | null;
  loading: boolean;
  confirming: boolean;
  error?: string | null;
  onSelectDate(date: string): void;
  onCompose(): Promise<void> | void;
  onConfirm(): Promise<void> | void;
  preferences?: DayPlanPreferences;
  onPreferencesChange?: (preferences: DayPlanPreferences) => void;
  /** Alias for consumers that use the usual controlled-field naming. */
  onChange?: (preferences: DayPlanPreferences) => void;
}

export function DayPlanSection({
  dates,
  selectedDate,
  draft,
  loading,
  confirming,
  error,
  onSelectDate,
  onCompose,
  onConfirm,
  preferences,
  onPreferencesChange,
  onChange,
}: DayPlanSectionProps) {
  const [internalPreferences, setInternalPreferences] = useState(DEFAULT_DAY_PLAN_PREFERENCES);
  const currentPreferences = preferences ?? internalPreferences;
  const changePreferences = (next: DayPlanPreferences) => {
    setInternalPreferences(next);
    onPreferencesChange?.(next);
    onChange?.(next);
  };
  const items = sortedDayPlanItems(draft?.items ?? []);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const preferencesSummary = summarizeDayPlanPreferences(currentPreferences);

  return (
    <View style={styles.section} accessibilityLabel="Itinéraire IA du jour">
      <AppText variant="label">Quel jour ?</AppText>

      {dates.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateList}
          accessibilityRole="tablist"
        >
          {dates.map((date) => (
            <Chip
              key={date}
              label={formatDayPlanDate(date)}
              active={date === selectedDate}
              onPress={() => onSelectDate(date)}
              style={styles.dateChip}
            />
          ))}
        </ScrollView>
      ) : (
        <InlineMessage title="Aucune date disponible" message="Ajoutez une étape pour composer une journée." />
      )}

      {error ? <InlineMessage variant="error" title="Composition impossible" message={error} /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: preferencesOpen }}
        accessibilityLabel={`Préférences : ${preferencesSummary}`}
        onPress={() => setPreferencesOpen((open) => !open)}
        style={styles.preferencesToggle}
      >
        <View style={styles.flexOne}>
          <AppText variant="label">Préférences</AppText>
          <AppText variant="caption" color="muted" numberOfLines={2}>{preferencesSummary}</AppText>
        </View>
        <AppText variant="label" color="accent">{preferencesOpen ? "Fermer" : "Modifier"}</AppText>
      </Pressable>

      {preferencesOpen ? (
        <DayPlanPreferencesForm
          value={currentPreferences}
          onChange={changePreferences}
          disabled={loading || confirming}
        />
      ) : null}

      <Button
        variant={draft ? "secondary" : "primary"}
        fullWidth
        loading={loading}
        disabled={dates.length === 0 || !selectedDate || confirming}
        onPress={() => void onCompose()}
        icon={<Icon name="sparkles" size={16} color={draft ? colors.accentStrong : colors.white} />}
      >
        {draft ? "Recomposer la journée" : "Composer la journée"}
      </Button>

      {loading ? (
        <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel="Composition en cours">
          <ActivityIndicator color={colors.accent} />
          <AppText variant="bodySmall" color="muted">L’IA prépare votre journée…</AppText>
        </View>
      ) : draft ? (
        <View style={styles.draft} accessibilityLabel={`Brouillon de ${items.length} élément${items.length === 1 ? "" : "s"}`}>
          <View style={styles.draftHeader}>
            <AppText variant="h3">Votre journée</AppText>
            <Badge label="Brouillon" variant="gold" />
          </View>
          {items.length === 0 ? (
            <InlineMessage title="Aucune proposition" message="Essayez de recomposer cette journée avec d’autres contraintes." />
          ) : (
            <View style={styles.items}>
              {items.map((item) => <DayPlanItem key={item.candidateId} item={item} candidate={draft.candidates.find((entry) => entry.id === item.candidateId)} />)}
            </View>
          )}
          <AppText variant="caption" color="muted">Rien n’est ajouté à l’itinéraire sans votre confirmation.</AppText>
          {items.length > 0 ? (
            <Button
              fullWidth
              loading={confirming}
              disabled={loading}
              onPress={() => void onConfirm()}
              icon={<Icon name="check" size={16} color={colors.white} />}
            >
              Ajouter à l’itinéraire
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const preferenceLabels = {
  mobility: { walking: "À pied", motorized: "Motorisé" },
  budget: { free: "Gratuit", economy: "Économique", moderate: "Modéré", premium: "Premium" },
  pace: { relaxed: "Tranquille", balanced: "Équilibré", full: "Dense" },
  theme: {
    romantic: "Romantique", beach: "Plage", food: "Resto", culture: "Musée / culture",
    nature: "Nature", shopping: "Shopping", family: "Famille", nightlife: "Sortie", mixed: "Mixte",
  },
} as const;

function DayPlanPreferencesForm({
  value,
  onChange,
  disabled,
}: {
  value: DayPlanPreferences;
  onChange: (value: DayPlanPreferences) => void;
  disabled: boolean;
}) {
  const update = (next: Partial<DayPlanPreferences>) => onChange(updateDayPlanPreferences(value, next));
  const updateConstraint = (next: Partial<NonNullable<DayPlanPreferences["constraints"]>>) =>
    update({ constraints: next });
  const chooseMobility = (mobility: DayPlanMobility) =>
    update({ mobility, radiusMeters: mobility === "walking" ? 5_000 : 10_000 });
  const press = (handler: () => void) => (disabled ? undefined : handler);

  return (
    <View style={styles.preferences} accessibilityLabel="Préférences de la journée">

      <PreferenceGroup label="Déplacement">
        <View style={styles.chipRow}>
          {(Object.keys(preferenceLabels.mobility) as DayPlanMobility[]).map((mobility) => (
            <Chip key={mobility} label={preferenceLabels.mobility[mobility]} active={value.mobility === mobility} onPress={press(() => chooseMobility(mobility))} style={styles.optionChip} />
          ))}
        </View>
        <View style={styles.chipRow}>
          {[5_000, 10_000].map((radiusMeters) => (
            <Chip key={radiusMeters} label={`${radiusMeters / 1_000} km`} active={value.radiusMeters === radiusMeters} onPress={press(() => update({ radiusMeters }))} style={styles.optionChip} />
          ))}
        </View>
      </PreferenceGroup>

      <PreferenceGroup label="Type de journée">
        <View style={styles.chipRow}>
          {(Object.keys(preferenceLabels.theme) as DayPlanTheme[]).map((theme) => (
            <Chip key={theme} label={preferenceLabels.theme[theme]} active={value.themes.includes(theme)} onPress={press(() => update({ themes: toggleDayPlanTheme(value.themes, theme) }))} style={styles.optionChip} />
          ))}
        </View>
      </PreferenceGroup>

      <PreferenceGroup label="Budget">
        <View style={styles.chipRow}>
          {(Object.keys(preferenceLabels.budget) as DayPlanBudget[]).map((budget) => (
            <Chip key={budget} label={preferenceLabels.budget[budget]} active={value.budget === budget} onPress={press(() => update({ budget }))} style={styles.optionChip} />
          ))}
        </View>
      </PreferenceGroup>

      <PreferenceGroup label="Rythme">
        <View style={styles.chipRow}>
          {(Object.keys(preferenceLabels.pace) as DayPlanPace[]).map((pace) => (
            <Chip key={pace} label={preferenceLabels.pace[pace]} active={value.pace === pace} onPress={press(() => update({ pace }))} style={styles.optionChip} />
          ))}
        </View>
      </PreferenceGroup>

      <PreferenceGroup label="Filtres facultatifs">
        <View style={styles.checkRow}>
          <Checkbox checked={value.constraints?.children ?? false} label="Avec enfants" disabled={disabled} onChange={(children) => updateConstraint({ children })} />
          <Checkbox checked={value.constraints?.accessibility ?? false} label="Accessible" disabled={disabled} onChange={(accessibility) => updateConstraint({ accessibility })} />
        </View>
        <View style={styles.chipRow}>
          {(["either", "indoor", "outdoor"] as const).map((indoorOutdoor) => (
            <Chip key={indoorOutdoor} label={{ either: "Intérieur ou extérieur", indoor: "Intérieur", outdoor: "Extérieur" }[indoorOutdoor]} active={(value.constraints?.indoorOutdoor ?? "either") === indoorOutdoor} onPress={press(() => updateConstraint({ indoorOutdoor }))} style={styles.optionChip} />
          ))}
        </View>
        <Input label="Régime alimentaire (facultatif)" value={(value.constraints?.dietary ?? []).join(", ")} onChangeText={(dietary) => updateConstraint({ dietary: dietary.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Végétarien, sans gluten…" editable={!disabled} />
        <View style={styles.timeRow}>
          <Input label="Début" value={value.constraints?.startTime ?? ""} onChangeText={(startTime) => updateConstraint({ startTime: startTime || undefined })} placeholder="09:00" keyboardType="numbers-and-punctuation" maxLength={5} editable={!disabled} containerStyle={styles.timeInput} />
          <Input label="Fin" value={value.constraints?.endTime ?? ""} onChangeText={(endTime) => updateConstraint({ endTime: endTime || undefined })} placeholder="21:00" keyboardType="numbers-and-punctuation" maxLength={5} editable={!disabled} containerStyle={styles.timeInput} />
        </View>
      </PreferenceGroup>
    </View>
  );
}

/** "À pied · 5 km · Mixte · Modéré · Équilibré", so the form can stay folded. */
export function summarizeDayPlanPreferences(value: DayPlanPreferences): string {
  const themes = value.themes.map((theme) => preferenceLabels.theme[theme]).join(", ");
  return [
    preferenceLabels.mobility[value.mobility],
    `${value.radiusMeters / 1_000} km`,
    themes,
    preferenceLabels.budget[value.budget],
    preferenceLabels.pace[value.pace],
  ].filter(Boolean).join(" · ");
}

function PreferenceGroup({ label, children }: { label: string; children: ReactNode }) {
  return <View style={styles.preferenceGroup}><AppText variant="caption" color="muted">{label}</AppText>{children}</View>;
}

function DayPlanItem({ item, candidate }: { item: DayPlanItemDraft; candidate?: DayPlanDraft["candidates"][number] }) {
  const time = item.localTime || "Horaire flexible";
  const rating = formatRating(candidate?.rating);
  const price = formatPriceLevel(candidate?.priceLevel);
  const distance = formatStraightLineDistance(item.distanceFromPreviousMeters);
  const reviewCount = candidate?.userRatingCount === undefined ? null : `${candidate.userRatingCount} avis`;
  return (
    <View style={styles.item} accessibilityLabel={`${item.title}, ${time}, ${formatDayPlanDuration(item.durationMinutes)}`}>
      <View style={styles.itemTime}>
        <Icon name="clock" size={14} color={colors.teal} />
        <AppText variant="label" color="teal">{time}</AppText>
      </View>
      <View style={styles.itemContent}>
        <AppText variant="label">{item.title}</AppText>
        <AppText variant="caption" color="muted">{item.reason}</AppText>
        <AppText variant="caption" color="muted">{formatDayPlanDuration(item.durationMinutes)}</AppText>
        {rating || reviewCount || price ? (
          <AppText variant="caption" color="muted">{[rating, reviewCount, price].filter(Boolean).join(" · ")}</AppText>
        ) : null}
        {item.openingStatus !== undefined ? (
          <AppText variant="caption" color="muted">{item.openingStatus === "verified_open" ? "Ouvert à cet horaire" : "Horaires non confirmés"}</AppText>
        ) : null}
        {distance ? <AppText variant="caption" color="muted">{distance}</AppText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  preferencesToggle: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  flexOne: { flex: 1 },
  dateList: { gap: spacing.sm, paddingVertical: 2 },
  dateChip: { minHeight: layout.minimumTouchTarget },
  loading: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  draft: { gap: spacing.md },
  draftHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  items: { gap: spacing.sm },
  item: { flexDirection: "row", gap: spacing.md, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  itemTime: { width: 78, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  itemContent: { flex: 1, gap: spacing.xs },
  preferences: { gap: spacing.md, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.bg },
  preferenceGroup: { gap: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  optionChip: { minHeight: 40 },
  checkRow: { gap: spacing.sm },
  timeRow: { flexDirection: "row", gap: spacing.sm },
  timeInput: { flex: 1 },
});

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { EMPTY_PARTY, describeParty, type TravelParty } from "../modules/trip-profiles";
import { colors, radius, spacing } from "../theme";
import { AppText, Button, Chip, Icon, InlineMessage, Switch } from "../ui";
import { CountryPickerSheet } from "./CountryPickerSheet";
import { formatCountry } from "./place-detail-model";

const AGES = Array.from({ length: 18 }, (_, age) => age);

/** Who travels: children with their age, a stroller, reduced mobility. */
export function TravelPartyCard({ party, defaultAdults = 1, saving, error, message, onSave }: {
  party: TravelParty | null;
  /** Shown until the adults are set: the number of members of the Voyage. */
  defaultAdults?: number;
  saving: boolean;
  error?: string | null;
  message?: string | null;
  onSave: (party: TravelParty) => Promise<void>;
}) {
  const [draft, setDraft] = useState<TravelParty>(party ?? EMPTY_PARTY);
  // Saving keeps the number shown, even if it was only the default.
  const save = () => onSave({ ...draft, adults: draft.adults ?? defaultAdults });
  const [pickingAge, setPickingAge] = useState(false);
  const [nationalityPicker, setNationalityPicker] = useState(false);
  const summary = describeParty(draft);

  return (
    <View style={styles.card}>
      <AppText variant="bodySmall" color="muted">
        L’IA adapte le rythme, les lieux et l’accessibilité des journées qu’elle compose.
      </AppText>

      <View style={styles.toggleRow}>
        <View style={styles.flexOne}>
          <AppText variant="label">Adultes</AppText>
          <AppText variant="caption" color="muted">Pour remplir les recherches d’hôtel et de billets</AppText>
        </View>
        <View style={styles.stepper}>
          <Pressable accessibilityRole="button" accessibilityLabel="Un adulte de moins" disabled={(draft.adults ?? 1) <= 1} onPress={() => setDraft((current) => ({ ...current, adults: Math.max(1, (current.adults ?? defaultAdults) - 1) }))} style={styles.stepButton}>
            <AppText variant="h3">−</AppText>
          </Pressable>
          <AppText variant="label" style={styles.stepValue}>{draft.adults ?? defaultAdults}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Un adulte de plus" disabled={(draft.adults ?? 1) >= 20} onPress={() => setDraft((current) => ({ ...current, adults: Math.min(20, (current.adults ?? defaultAdults) + 1) }))} style={styles.stepButton}>
            <AppText variant="h3">+</AppText>
          </Pressable>
        </View>
      </View>

      <AppText variant="label">Enfants</AppText>
      <View style={styles.wrap}>
        {draft.childrenAges.map((age, index) => (
          <Chip
            key={`${age}-${index}`}
            label={`${age === 0 ? "moins d’1 an" : `${age} an${age > 1 ? "s" : ""}`}  ✕`}
            active
            onPress={() => setDraft((current) => ({ ...current, childrenAges: current.childrenAges.filter((_, position) => position !== index) }))}
          />
        ))}
        {draft.childrenAges.length < 8 ? (
          <Chip label="+ Ajouter un enfant" onPress={() => setPickingAge((current) => !current)} />
        ) : null}
      </View>
      {pickingAge ? (
        <View style={styles.agePicker}>
          <AppText variant="caption" color="muted">Âge de l’enfant</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ages}>
            {AGES.map((age) => (
              <Chip
                key={age}
                label={age === 0 ? "< 1 an" : `${age} an${age > 1 ? "s" : ""}`}
                onPress={() => {
                  setDraft((current) => ({ ...current, childrenAges: [...current.childrenAges, age] }));
                  setPickingAge(false);
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <AppText variant="label">Autres nationalités du groupe</AppText>
      <AppText variant="caption" color="muted">Celle de chaque Membre vient de son compte. Ajoutez par exemple un enfant binational ou un proche sans compte.</AppText>
      <View style={styles.wrap}>
        {(draft.nationalities ?? []).map((code) => (
          <Chip key={code} label={`${formatCountry(code) ?? code}  ✕`} active onPress={() => setDraft((current) => ({ ...current, nationalities: (current.nationalities ?? []).filter((item) => item !== code) }))} />
        ))}
        {(draft.nationalities ?? []).length < 6 ? <Chip label="+ Ajouter une nationalité" onPress={() => setNationalityPicker(true)} /> : null}
      </View>
      <CountryPickerSheet
        visible={nationalityPicker}
        title="Nationalité d’un voyageur"
        onPick={(code) => setDraft((current) => ({ ...current, nationalities: [...new Set([...(current.nationalities ?? []), code])] }))}
        onClose={() => setNationalityPicker(false)}
      />

      {/* The Switch only labels itself for VoiceOver: the visible text sits beside it. */}
      <View style={styles.toggleRow}>
        <View style={styles.flexOne}>
          <AppText variant="label">Poussette</AppText>
          <AppText variant="caption" color="muted">Parcours sans marches quand c’est possible</AppText>
        </View>
        <Switch label="Poussette" value={draft.stroller} onChange={(stroller) => setDraft((current) => ({ ...current, stroller }))} />
      </View>
      <View style={styles.toggleRow}>
        <View style={styles.flexOne}>
          <AppText variant="label">Mobilité réduite</AppText>
          <AppText variant="caption" color="muted">Lieux accessibles et trajets courts</AppText>
        </View>
        <Switch label="Mobilité réduite" value={draft.reducedMobility} onChange={(reducedMobility) => setDraft((current) => ({ ...current, reducedMobility }))} />
      </View>

      {summary ? (
        <View style={styles.summary}>
          <Icon name="users" size={16} color={colors.tealStrong} />
          <AppText variant="caption" color="teal" style={styles.flexOne}>{summary}</AppText>
        </View>
      ) : null}
      {error ? <InlineMessage variant="error" title="Enregistrement impossible" message={error} /> : null}
      {message ? <InlineMessage variant="success" title="Voyageurs enregistrés" message={message} /> : null}
      <Button fullWidth variant="secondary" loading={saving} onPress={() => void save()}>
        Enregistrer les voyageurs
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  agePicker: { gap: spacing.xs },
  ages: { gap: spacing.sm },
  summary: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.tealSoft },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepButton: { width: 36, height: 36, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  stepValue: { minWidth: 20, textAlign: "center" },
  flexOne: { flex: 1 },
});

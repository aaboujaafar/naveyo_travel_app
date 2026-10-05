import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { EMPTY_PARTY, describeParty, type TravelParty } from "../modules/trip-profiles";
import { colors, radius, spacing } from "../theme";
import { AppText, Button, Chip, Icon, InlineMessage, Switch } from "../ui";

const AGES = Array.from({ length: 18 }, (_, age) => age);

/** Who travels: children with their age, a stroller, reduced mobility. */
export function TravelPartyCard({ party, saving, error, message, onSave }: {
  party: TravelParty | null;
  saving: boolean;
  error?: string | null;
  message?: string | null;
  onSave: (party: TravelParty) => Promise<void>;
}) {
  const [draft, setDraft] = useState<TravelParty>(party ?? EMPTY_PARTY);
  const [pickingAge, setPickingAge] = useState(false);
  const summary = describeParty(draft);

  return (
    <View style={styles.card}>
      <AppText variant="bodySmall" color="muted">
        L’IA adapte le rythme, les lieux et l’accessibilité des journées qu’elle compose.
      </AppText>

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

      <Switch label="Poussette" value={draft.stroller} onChange={(stroller) => setDraft((current) => ({ ...current, stroller }))} />
      <Switch label="Mobilité réduite" value={draft.reducedMobility} onChange={(reducedMobility) => setDraft((current) => ({ ...current, reducedMobility }))} />

      {summary ? (
        <View style={styles.summary}>
          <Icon name="users" size={16} color={colors.tealStrong} />
          <AppText variant="caption" color="teal" style={styles.flexOne}>{summary}</AppText>
        </View>
      ) : null}
      {error ? <InlineMessage variant="error" title="Enregistrement impossible" message={error} /> : null}
      {message ? <InlineMessage variant="success" title="Voyageurs enregistrés" message={message} /> : null}
      <Button fullWidth variant="secondary" loading={saving} onPress={() => void onSave(draft)}>
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
  flexOne: { flex: 1 },
});

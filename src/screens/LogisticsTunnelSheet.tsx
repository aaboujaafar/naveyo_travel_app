import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { LogisticsGap, LogisticsWaiver } from "../modules/logistics";
import { colors, radius, spacing } from "../theme";
import { AppText, BottomSheet, Button, Chip, Icon, InlineMessage, Input } from "../ui";
import { describeGap } from "./logistics-model";

const STAY_MODES: { mode: "friends" | "camping" | "other"; label: string }[] = [
  { mode: "friends", label: "Chez des proches" },
  { mode: "camping", label: "Camping / van" },
  { mode: "other", label: "Autre" },
];

/**
 * One question per missing night or journey: already booked, search, not
 * needed, or later. Shown after creating a Voyage or an Étape, and from
 * « Préparation ».
 */
export function LogisticsTunnelSheet({ gaps, startKey, onImport, onSearch, onWaive, onClose }: {
  /** Null hides the sheet. */
  gaps: LogisticsGap[] | null;
  startKey?: string;
  onImport: (gap: LogisticsGap) => void;
  /** Absent until search links exist for this kind of gap. */
  onSearch?: (gap: LogisticsGap) => void;
  onWaive: (waiver: LogisticsWaiver) => Promise<void>;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [lastStart, setLastStart] = useState<string | undefined>(undefined);
  const [waiving, setWaiving] = useState(false);
  const [mode, setMode] = useState<"friends" | "camping" | "other">("friends");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A new opening starts at the gap that was touched (adjusted during render).
  if (startKey !== lastStart) {
    setLastStart(startKey);
    setIndex(Math.max(0, gaps?.findIndex((gap) => gap.key === startKey) ?? 0));
    setWaiving(false);
  }

  const gap = gaps?.[index];
  const next = () => {
    setWaiving(false);
    setAddress("");
    setError(null);
    if (!gaps || index + 1 >= gaps.length) onClose();
    else setIndex(index + 1);
  };

  const waive = async () => {
    if (!gap) return;
    setSaving(true);
    setError(null);
    try {
      await onWaive(gap.kind === "stay"
        ? { kind: "stay", stopId: gap.stop.id, mode, ...(address.trim() ? { address: address.trim() } : {}) }
        : { kind: "leg", legKey: gap.key });
      // The list shrinks once the waiver is saved: stay on the same position.
      setWaiving(false);
      setAddress("");
      if (!gaps || gaps.length <= 1) onClose();
      else if (index >= gaps.length - 1) setIndex(Math.max(0, index - 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  if (!gaps || !gap) return null;
  const { title, detail } = describeGap(gap);
  const isStay = gap.kind === "stay";

  return (
    <BottomSheet visible onClose={onClose} maxHeight={680} title={isStay ? "Où dormez-vous ?" : "Comment y allez-vous ?"}>
      <View style={styles.gapCard}>
        <Icon name={isStay ? "home" : "map"} size={20} color={colors.accentStrong} />
        <View style={styles.flexOne}>
          <AppText variant="label">{title}</AppText>
          <AppText variant="caption" color="muted">{detail}</AppText>
        </View>
        {gaps.length > 1 ? <AppText variant="caption" color="muted">{`${index + 1} sur ${gaps.length}`}</AppText> : null}
      </View>

      {error ? <InlineMessage variant="error" title="Enregistrement impossible" message={error} /> : null}

      {waiving ? (
        <View style={styles.waiver}>
          {isStay ? (
            <>
              <View style={styles.chips}>
                {STAY_MODES.map((item) => <Chip key={item.mode} label={item.label} active={mode === item.mode} onPress={() => setMode(item.mode)} />)}
              </View>
              <Input label="Adresse (facultatif)" value={address} onChangeText={setAddress} placeholder="Pour la fiche Urgence et le chauffeur" maxLength={300} />
            </>
          ) : (
            <AppText variant="bodySmall" color="muted">Voiture personnelle, covoiturage, à pied… Ce trajet ne sera plus proposé.</AppText>
          )}
          <Button fullWidth loading={saving} onPress={() => void waive()}>{isStay ? "C’est réglé" : "Pas besoin de billet"}</Button>
          <Pressable accessibilityRole="button" onPress={() => setWaiving(false)} style={styles.link}><AppText variant="caption" color="muted">Retour</AppText></Pressable>
        </View>
      ) : (
        <View style={styles.choices}>
          <Choice icon="check" label="J’ai déjà réservé" detail="Importer la confirmation (photo, PDF, partage)" onPress={() => onImport(gap)} />
          {onSearch ? <Choice icon="search" label={isStay ? "Chercher un hébergement" : "Chercher un billet"} detail="Dates et voyageurs déjà remplis · lien partenaire" onPress={() => onSearch(gap)} /> : null}
          <Choice icon="users" label={isStay ? "Chez des proches / pas besoin" : "Pas besoin de billet"} detail={isStay ? "Proches, camping, van…" : "Voiture, covoiturage, à pied…"} onPress={() => setWaiving(true)} />
          <Pressable accessibilityRole="button" onPress={next} style={styles.link}>
            <AppText variant="label" color="muted">{gaps.length > index + 1 ? "Plus tard · question suivante" : "Plus tard"}</AppText>
          </Pressable>
        </View>
      )}
    </BottomSheet>
  );
}

function Choice({ icon, label, detail, onPress }: { icon: "check" | "search" | "users"; label: string; detail: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}>
      <View style={styles.choiceIcon}><Icon name={icon} size={16} color={colors.tealStrong} /></View>
      <View style={styles.flexOne}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="caption" color="muted">{detail}</AppText>
      </View>
      <Icon name="arrow-right" size={16} color={colors.fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gapCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  choices: { gap: spacing.sm },
  choice: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  choiceIcon: { width: 32, height: 32, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealSoft },
  waiver: { gap: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  link: { alignSelf: "center", padding: spacing.sm },
  pressed: { opacity: 0.7 },
  flexOne: { flex: 1 },
});

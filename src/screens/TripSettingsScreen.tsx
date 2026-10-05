import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Trip } from "../modules/trips";
import type { TravelParty } from "../modules/trip-profiles";
import { TravelPartyCard } from "./TravelPartyCard";
import { colors, layout, radius, shadows, spacing, zIndex } from "../theme";
import {
  AppText,
  Badge,
  Button,
  DatePickerField,
  Icon,
  IconButton,
  InlineMessage,
  Input,
} from "../ui";
import {
  validateTripSettings,
  type TripSettingsValues,
} from "./trip-settings-model";

export interface TripSettingsScreenProps {
  trip: Trip | null;
  saving: boolean;
  message?: string | null;
  error?: string | null;
  onBack: () => void;
  onSave: (values: TripSettingsValues) => Promise<void>;
  onOpenInvitation: () => void;
  /** Names shared by the members, keyed by account; the current account is flagged. */
  memberNames?: Record<string, string>;
  currentAccountId?: string | null;
  party?: TravelParty | null;
  partyStatus?: { saving: boolean; error: string | null; message: string | null };
  onSaveParty?: (party: TravelParty) => Promise<void>;
}

export function TripSettingsScreen(props: TripSettingsScreenProps) {
  const { trip, saving, message, error, onBack, onSave, onOpenInvitation } = props;
  const insets = useSafeAreaInsets();
  const [attempted, setAttempted] = useState(false);
  const [values, setValues] = useState<TripSettingsValues>(() => ({
    name: trip?.name ?? "",
    startsOn: trip?.startsOn ?? "",
    endsOn: trip?.endsOn ?? "",
    referenceCurrency: trip?.referenceCurrency ?? "EUR",
  }));
  const validation = validateTripSettings(values);
  const ready = Object.keys(validation).length === 0 && trip !== null;
  const headerInsetStyle = useMemo(
    () => ({ paddingTop: Math.max(insets.top, spacing.lg) }),
    [insets.top],
  );

  const submit = async () => {
    setAttempted(true);
    if (!ready) return;
    await onSave(values);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, headerInsetStyle]}>
          <IconButton
            icon={<Icon name="arrow-left" size={20} />}
            onPress={onBack}
            accessibilityLabel="Retour au Voyage"
          />
          <View style={styles.headerText}>
            <AppText variant="h2">Réglages du Voyage</AppText>
            <AppText variant="caption" color="muted">
              Les modifications nécessitent une connexion.
            </AppText>
          </View>
          <Icon name="settings" size={22} color={colors.muted} />
        </View>

        {error ? (
          <View style={styles.horizontalSection}>
            <InlineMessage variant="error" title="Modification refusée" message={error} />
          </View>
        ) : null}
        {message ? (
          <View style={styles.horizontalSection}>
            <InlineMessage variant="success" title="Voyage enregistré" message={message} />
          </View>
        ) : null}

        <View style={styles.tripCard}>
          <View style={styles.tripAvatar}>
            <Icon name="map" size={32} color={colors.white} />
          </View>
          <AppText variant="h2" align="center">{trip?.name ?? "Chargement…"}</AppText>
          <AppText variant="bodySmall" color="muted" align="center">
            {trip ? `${trip.members.length} compte${trip.members.length > 1 ? "s" : ""} · ${trip.referenceCurrency}` : "Voyage indisponible"}
          </AppText>
          <Badge label="Privé" variant="accent" />
        </View>

        <View style={styles.sectionBlock}>
          <AppText variant="h3" style={styles.sectionTitle}>Informations principales</AppText>
          <View style={styles.formCard}>
            <Input
              label="Nom du Voyage"
              value={values.name}
              onChangeText={(name) => setValues((current) => ({ ...current, name }))}
              placeholder="Portugal 2026"
              error={attempted ? validation.name : undefined}
            />
            <View style={styles.dateRow}>
              <DatePickerField
                label="Début"
                value={values.startsOn}
                onChange={(startsOn) => setValues((current) => ({ ...current, startsOn }))}
                error={attempted ? validation.startsOn : undefined}
                containerStyle={styles.dateInput}
              />
              <DatePickerField
                label="Fin"
                value={values.endsOn}
                onChange={(endsOn) => setValues((current) => ({ ...current, endsOn }))}
                minimumDate={values.startsOn || undefined}
                error={attempted ? validation.endsOn : undefined}
                containerStyle={styles.dateInput}
              />
            </View>
            <Input
              label="Devise de référence"
              value={values.referenceCurrency}
              onChangeText={(referenceCurrency) =>
                setValues((current) => ({ ...current, referenceCurrency }))
              }
              placeholder="EUR"
              autoCapitalize="characters"
              maxLength={3}
              error={attempted ? validation.referenceCurrency : undefined}
              hint="Code ISO 4217 conservé avec le Voyage."
            />
            <Button
              fullWidth
              loading={saving}
              disabled={!trip || saving}
              onPress={() => void submit()}
            >
              Enregistrer le Voyage
            </Button>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <AppText variant="h3">Membres du Voyage</AppText>
            <Badge label={`${trip?.members.length ?? 0} compte(s)`} variant="teal" />
          </View>
          <View style={styles.formCard}>
            {trip?.members.map((member, index) => {
              const name = props.memberNames?.[member.accountId] ?? `Compte ${index + 1}`;
              const isMe = props.currentAccountId === member.accountId;
              return (
              <View key={member.accountId} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <AppText variant="label" color="accent">{name.slice(0, 1).toUpperCase()}</AppText>
                </View>
                <View style={styles.memberInfo}>
                  <AppText variant="label">{isMe ? `${name} (vous)` : name}</AppText>
                  <AppText variant="caption" color="muted">
                    {member.role === "owner" ? "Propriétaire" : "Éditeur"}
                  </AppText>
                </View>
              </View>
              );
            })}
            <Button fullWidth variant="secondary" onPress={onOpenInvitation} disabled={!trip}>
              Inviter le second Compte
            </Button>
          </View>
        </View>

        {props.onSaveParty ? (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <AppText variant="h3">Qui voyage ?</AppText>
            </View>
            <TravelPartyCard
              key={props.party ? "loaded" : "empty"}
              party={props.party ?? null}
              saving={props.partyStatus?.saving ?? false}
              error={props.partyStatus?.error}
              message={props.partyStatus?.message}
              onSave={props.onSaveParty}
            />
          </View>
        ) : null}

        <ComingSoonSection title="Photo de couverture">
          <View style={styles.coverPreview}>
            <Icon name="image" size={32} color={colors.muted} />
            <AppText variant="bodySmall" color="muted">Personnaliser la couverture</AppText>
          </View>
        </ComingSoonSection>

        <ComingSoonSection title="Notifications du Voyage">
          <View style={styles.formCard}>
            {['Nouveaux Documents', 'Rappels de programme', 'Suggestions IA'].map((label) => (
              <View key={label} style={styles.preferenceRow}>
                <AppText variant="bodySmall">{label}</AppText>
                <View style={styles.togglePreview}><View style={styles.toggleKnob} /></View>
              </View>
            ))}
          </View>
        </ComingSoonSection>

        <ComingSoonSection title="Archivage et suppression">
          <View style={styles.formCard}>
            <Button fullWidth variant="secondary" disabled onPress={() => undefined}>Archiver le Voyage</Button>
            <Button fullWidth variant="outline" disabled onPress={() => undefined}>Supprimer le Voyage</Button>
          </View>
        </ComingSoonSection>

        <View style={styles.offlineNote}>
          <Icon name="info" size={20} color={colors.gold} />
          <AppText variant="caption" color="muted" style={styles.offlineText}>
            En V0, les mutations ordinaires restent désactivées hors ligne. Le paquet de voyage existant demeure consultable jusqu’à une synchronisation complète.
          </AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ComingSoonSection({ title, children }: { title: string; children: React.ReactNode }) {
  void title;
  void children;
  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingBottom: spacing.xl },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  horizontalSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  tripCard: { alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.xl, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.sm },
  tripAvatar: { width: spacing["2xl"] * 2, height: spacing["2xl"] * 2, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent, ...shadows.accent },
  sectionBlock: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.md },
  formCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  dateRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  dateInput: { flex: 1 },
  memberRow: { minHeight: spacing["2xl"] + spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  memberAvatar: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft },
  memberInfo: { flex: 1, gap: spacing.xs },
  coverPreview: { minHeight: spacing["2xl"] * 3, alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, backgroundColor: colors.surface },
  preferenceRow: { minHeight: spacing["2xl"] + spacing.xs, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  togglePreview: { width: spacing["2xl"], height: spacing.xl - spacing.xs, alignItems: "flex-end", justifyContent: "center", padding: spacing.xs, borderRadius: radius.full, backgroundColor: colors.accent },
  toggleKnob: { width: spacing.lg - spacing.xs, height: spacing.lg - spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface },
  comingSoonFrame: { position: "relative" },
  comingSoonContent: { opacity: 0.46 },
  comingSoonBadge: { position: "absolute", top: spacing.sm, right: spacing.sm, zIndex: zIndex.sticky },
  offlineNote: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.goldSoft },
  offlineText: { flex: 1 },
});

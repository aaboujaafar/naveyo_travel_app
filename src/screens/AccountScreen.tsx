import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Account } from "../modules/identity";
import type { OfflineTripPackLoad } from "../modules/offline-trip-pack";
import type { Trip } from "../modules/trips";
import { colors, layout, radius, shadows, spacing, zIndex } from "../theme";
import { destinationImageLabel, destinationImageSource } from "../ui/destination-image";
import {
  AppText,
  Badge,
  BottomSheet,
  Button,
  Icon,
  IconButton,
  InlineMessage,
  ProgressBar,
  Skeleton,
} from "../ui";
import {
  accountDisplayName,
  accountInitials,
  currentTripForAccount,
  tripDateLabel,
} from "./account-screen-model";

export interface AccountScreenProps {
  account: Account | null;
  trips: Trip[];
  countryCount: number;
  offline: OfflineTripPackLoad | null;
  version: string;
  loading: boolean;
  error?: string | null;
  signingOut: boolean;
  onBack: () => void;
  onOpenTrip: (tripId: Trip["id"]) => void;
  onOpenTripSettings: (tripId: Trip["id"]) => void;
  onOpenInvitation: (tripId: Trip["id"]) => void;
  onOpenExpenses: (tripId: Trip["id"]) => void;
  onSignOut: () => Promise<void>;
}

export function AccountScreen({
  account,
  trips,
  countryCount,
  offline,
  version,
  loading,
  error,
  signingOut,
  onBack,
  onOpenTrip,
  onOpenTripSettings,
  onOpenInvitation,
  onOpenExpenses,
  onSignOut,
}: AccountScreenProps) {
  const insets = useSafeAreaInsets();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const currentTrip = currentTripForAccount(trips);
  const headerInsetStyle = useMemo(
    () => ({ paddingTop: Math.max(insets.top, spacing.lg) }),
    [insets.top],
  );
  const navigationInsetStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, spacing.sm) }),
    [insets.bottom],
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, headerInsetStyle]}>
          <View style={styles.headerTitleRow}>
            <IconButton
              icon={<Icon name="arrow-left" size={20} />}
              onPress={onBack}
              accessibilityLabel="Retour"
            />
            <AppText variant="h2" style={styles.headerTitle}>Mon compte</AppText>
          </View>
          <IconButton
            icon={<Icon name="settings" size={22} />}
            onPress={() => {
              if (currentTrip) onOpenTripSettings(currentTrip.id);
            }}
            disabled={!currentTrip}
            accessibilityLabel="Réglages du Voyage"
          />
        </View>

        {error ? (
          <View style={styles.horizontalSection}>
            <InlineMessage variant="error" title="Compte incomplet" message={error} />
          </View>
        ) : null}

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <AppText variant="h1" color="onAccent">{accountInitials(account)}</AppText>
          </View>
          <AppText variant="h2" align="center">{accountDisplayName(account)}</AppText>
          <AppText variant="bodySmall" color="muted" align="center">
            {account?.email ?? "Adresse e-mail indisponible"}
          </AppText>
          <View style={styles.statsRow}>
            <ProfileStat value={`${trips.length}`} label="voyages" />
            <ProfileStat value={`${countryCount}`} label="pays" />
          </View>
          <ComingSoonFrame label="Modification du profil">
            <Button variant="secondary" icon={<Icon name="settings" size={16} />} disabled onPress={() => undefined}>
              Modifier le profil
            </Button>
          </ComingSoonFrame>
        </View>

        {loading ? (
          <View style={styles.activeTripCard}>
            <Skeleton width="60%" height={spacing.lg} />
            <Skeleton width="100%" height={spacing.sm} borderRadius={radius.full} />
            <Skeleton width="100%" height={spacing["2xl"]} />
          </View>
        ) : currentTrip ? (
          <View style={styles.activeTripCard}>
            <Image source={destinationImageSource(currentTrip.name, currentTrip.imageUrl)} style={styles.activeTripCover} resizeMode="cover" accessibilityLabel={destinationImageLabel(currentTrip.name, currentTrip.imageUrl)} />
            <View style={styles.activeTripHeader}>
              <View style={styles.activeTripTitle}>
                <AppText variant="h3">{currentTrip.name}</AppText>
                <AppText variant="caption" color="muted">{tripDateLabel(currentTrip)}</AppText>
              </View>
              <Badge label="Voyage privé" variant="accent" />
            </View>
            <View style={styles.activeTripProgress}><ProgressBar progress={0} /></View>
            <View style={styles.quickLinks}>
              <QuickLink icon="home" label="Dashboard" onPress={() => onOpenTrip(currentTrip.id)} />
              <QuickLink icon="image" label="Photos" comingSoon />
              <QuickLink icon="wallet" label="Budget" onPress={() => onOpenExpenses(currentTrip.id)} />
            </View>
            <View style={{ marginHorizontal: spacing.lg }}><Button
              size="sm"
              variant="secondary"
              onPress={() => onOpenTripSettings(currentTrip.id)}
            >
              Régler ce Voyage
            </Button></View>
          </View>
        ) : (
          <View style={styles.horizontalSection}>
            <InlineMessage
              variant="info"
              title="Aucun Voyage"
              message="Créez un Voyage pour afficher ses réglages et son paquet hors ligne."
            />
          </View>
        )}

        <ComingSoonSection title="Mes voyages archivés">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.archivedTrips}>
            {['Barcelone 2025', 'Rome 2024', 'Amsterdam 2024'].map((name) => (
              <View key={name} style={styles.archivedTripCard}>
                <View style={styles.archivedThumb}>
                  <AppText variant="label" color="onAccent">{name}</AppText>
                </View>
                <View style={styles.archivedBody}>
                  <AppText variant="caption" color="muted">Récap disponible après le Voyage</AppText>
                </View>
              </View>
            ))}
          </ScrollView>
        </ComingSoonSection>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <AppText variant="h3">Membres du Voyage</AppText>
            {currentTrip ? (
              <Button size="sm" variant="ghost" onPress={() => onOpenInvitation(currentTrip.id)}>
                Gérer
              </Button>
            ) : null}
          </View>
          <View style={styles.sectionCard}>
            {currentTrip?.members.map((member, index) => (
              <View key={member.accountId} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <AppText variant="label" color="accent">C{index + 1}</AppText>
                </View>
                <View style={styles.memberInfo}>
                  <AppText variant="label">Compte {index + 1}</AppText>
                  <AppText variant="caption" color="muted">
                    {member.role === "owner" ? "Propriétaire" : "Éditeur"}
                  </AppText>
                </View>
                <Badge label="Privé" variant="teal" />
              </View>
            ))}
            {currentTrip?.members.length === 0 ? (
              <AppText variant="bodySmall" color="muted">Aucun membre chargé.</AppText>
            ) : null}
          </View>
        </View>

        <ComingSoonSection title="Notifications">
          <View style={styles.sectionCard}>
            {['Nouveaux Documents', 'Rappels de programme', 'Alertes budget', 'Suggestions IA'].map((label, index) => (
              <View key={label} style={styles.preferenceRow}>
                <AppText variant="bodySmall" style={styles.preferenceLabel}>{label}</AppText>
                <View style={[styles.togglePreview, index === 3 && styles.togglePreviewOff]}>
                  <View style={styles.toggleKnob} />
                </View>
              </View>
            ))}
          </View>
        </ComingSoonSection>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}><AppText variant="h3">Mode hors ligne</AppText></View>
          <View style={styles.sectionCard}>
            <AppText variant="sectionTitle" color="muted">CONTENU TÉLÉCHARGÉ</AppText>
            <StorageRow
              name="Paquet du Voyage"
              detail={offline?.state === "ready" ? "Disponible ✓" : "Non disponible"}
              ready={offline?.state === "ready"}
            />
            <StorageRow
              name="Documents attendus"
              detail={`${offline?.manifest?.files.length ?? 0} fichier(s)`}
              ready={offline?.state === "ready"}
            />
            <AppText variant="caption" color="muted" align="center">
              {offline?.manifest
                ? `Dernière génération : ${offline.manifest.generatedAt}`
                : "Aucun manifeste actif pour ce Voyage."}
            </AppText>
          </View>
        </View>

        <ComingSoonSection title="Préférences">
          <View style={styles.sectionCard}>
            <PreferencePreview label="Langue" value="Français" />
            <PreferencePreview label="Devise" value={currentTrip?.referenceCurrency ?? "EUR"} />
            <PreferencePreview label="Unités" value="km" />
            <PreferencePreview label="Thème" value="Clair" />
          </View>
        </ComingSoonSection>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}><AppText variant="h3">À propos / Support</AppText></View>
          <View style={styles.sectionCard}>
            <PreferencePreview label="Version" value={`Naveyo ${version}`} />
            <ComingSoonFrame label="Centre d’aide et support">
              <PreferencePreview label="Centre d’aide" value="Ouvrir" />
              <PreferencePreview label="Nous contacter" value="Ouvrir" />
              <PreferencePreview label="Confidentialité" value="Ouvrir" />
            </ComingSoonFrame>
            <Button fullWidth variant="outline" onPress={() => setLogoutVisible(true)}>
              Déconnexion
            </Button>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomNav, navigationInsetStyle]}>
        <BottomNavItem icon="home" label="Accueil" onPress={() => currentTrip && onOpenTrip(currentTrip.id)} disabled={!currentTrip} />
        <BottomNavItem icon="search" label="Explorer" comingSoon />
        <BottomNavItem icon="image" label="Photos" comingSoon />
        <BottomNavItem icon="file-text" label="Journal" comingSoon />
        <BottomNavItem icon="layers" label="Récap" comingSoon />
      </View>

      <BottomSheet visible={logoutVisible} onClose={() => setLogoutVisible(false)} title="Déconnexion">
        <AppText variant="bodySmall" color="muted" align="center">
          Voulez-vous vraiment fermer la session de ce Compte ?
        </AppText>
        <View style={styles.modalActions}>
          <Button variant="secondary" onPress={() => setLogoutVisible(false)}>Annuler</Button>
          <Button
            variant="danger"
            loading={signingOut}
            onPress={() => void onSignOut()}
          >
            Confirmer
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
}

function ProfileStat({ value, label, muted = false }: { value: string; label: string; muted?: boolean }) {
  return <View style={styles.profileStat}><AppText variant="h3" color={muted ? "muted" : "fg"}>{value}</AppText><AppText variant="caption" color="muted" align="center">{label}</AppText></View>;
}

function QuickLink({ icon, label, onPress, comingSoon = false }: { icon: "home" | "image" | "wallet"; label: string; onPress?: () => void; comingSoon?: boolean }) {
  if (comingSoon) return null;
  return <Pressable disabled={!onPress} onPress={onPress} accessibilityRole="button" accessibilityState={{ disabled: !onPress }} style={styles.quickLink}><Icon name={icon} size={16} color={colors.fg} /><AppText variant="caption">{label}</AppText></Pressable>;
}

function ComingSoonFrame({ label, children }: { label: string; children: React.ReactNode }) {
  void label;
  void children;
  return null;
}

function ComingSoonSection({ title, children }: { title: string; children: React.ReactNode }) {
  void title;
  void children;
  return null;
}

function StorageRow({ name, detail, ready }: { name: string; detail: string; ready: boolean }) {
  return <View style={styles.storageRow}><AppText variant="bodySmall">{name}</AppText><AppText variant="caption" color={ready ? "success" : "muted"}>{detail}</AppText></View>;
}

function PreferencePreview({ label, value }: { label: string; value: string }) {
  return <View style={styles.preferenceRow}><AppText variant="bodySmall" style={styles.preferenceLabel}>{label}</AppText><View style={styles.preferenceValue}><AppText variant="caption">{value}</AppText><Icon name="chevron-down" size={14} color={colors.muted} /></View></View>;
}

function BottomNavItem({ icon, label, onPress, comingSoon = false, disabled = false }: { icon: "home" | "search" | "image" | "file-text" | "layers"; label: string; onPress?: () => void; comingSoon?: boolean; disabled?: boolean }) {
  if (comingSoon) return null;
  const unavailable = disabled || comingSoon || !onPress;
  return <Pressable disabled={unavailable} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}${comingSoon ? ", à venir" : ""}`} accessibilityState={{ disabled: unavailable }} style={[styles.bottomNavItem, unavailable && styles.disabled]}><Icon name={icon} size={20} color={colors.muted} /><AppText variant="badge" color="muted">{label}</AppText>{comingSoon ? <AppText variant="badge" color="gold">À venir</AppText> : null}</Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingBottom: spacing["2xl"] * 3 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerTitle: { flex: 1 },
  horizontalSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  profileCard: { alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.sm },
  profileAvatar: { width: spacing["2xl"] * 2, height: spacing["2xl"] * 2, borderRadius: radius.full, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm, backgroundColor: colors.accent, ...shadows.accent },
  statsRow: { flexDirection: "row", justifyContent: "center", gap: spacing.lg, marginVertical: spacing.md },
  profileStat: { minWidth: spacing["2xl"], alignItems: "center", gap: spacing.xs },
  activeTripCard: { gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.lg, paddingBottom: spacing.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface, overflow: "hidden", ...shadows.sm },
  activeTripCover: { width: "100%", height: spacing["2xl"] * 3, backgroundColor: colors.tealSoft },
  activeTripHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md, paddingHorizontal: spacing.lg },
  activeTripTitle: { flex: 1, gap: spacing.xs },
  activeTripProgress: { marginHorizontal: spacing.lg },
  quickLinks: { flexDirection: "row", gap: spacing.sm, marginHorizontal: spacing.lg },
  quickLink: { flex: 1, minHeight: layout.minimumTouchTarget, alignItems: "center", justifyContent: "center", gap: spacing.xs, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.bg },
  sectionBlock: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionHeader: { minHeight: layout.minimumTouchTarget, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.sm },
  sectionCard: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  archivedTrips: { gap: spacing.md, paddingBottom: spacing.sm },
  archivedTripCard: { width: spacing["2xl"] * 4.5, overflow: "hidden", borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  archivedThumb: { minHeight: spacing["2xl"] * 2, justifyContent: "flex-end", padding: spacing.md, backgroundColor: colors.accent },
  archivedBody: { padding: spacing.md },
  memberRow: { minHeight: spacing["2xl"] + spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  memberAvatar: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft },
  memberInfo: { flex: 1, gap: spacing.xs },
  preferenceRow: { minHeight: spacing["2xl"] + spacing.xs, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  preferenceLabel: { flex: 1 },
  preferenceValue: { minHeight: layout.minimumTouchTarget, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.bg },
  togglePreview: { width: spacing["2xl"], height: spacing.xl - spacing.xs, alignItems: "flex-end", justifyContent: "center", padding: spacing.xs, borderRadius: radius.full, backgroundColor: colors.accent },
  togglePreviewOff: { alignItems: "flex-start", backgroundColor: colors.border },
  toggleKnob: { width: spacing.lg - spacing.xs, height: spacing.lg - spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface },
  storageRow: { minHeight: spacing["2xl"] + spacing.xs, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  comingSoonFrame: { position: "relative" },
  comingSoonContent: { opacity: 0.46 },
  comingSoonBadge: { position: "absolute", top: spacing.sm, right: spacing.sm, zIndex: zIndex.sticky },
  modalActions: { flexDirection: "row", justifyContent: "center", gap: spacing.md, paddingBottom: spacing.md },
  bottomNav: { position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: layout.maxMobileWidth, alignSelf: "center", flexDirection: "row", paddingTop: spacing.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, zIndex: zIndex.sticky, ...shadows.sm },
  bottomNavItem: { flex: 1, minHeight: spacing["2xl"], alignItems: "center", justifyContent: "center", gap: spacing.xs },
  disabled: { opacity: 0.44 },
});

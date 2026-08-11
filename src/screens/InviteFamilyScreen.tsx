import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  TripInvitation,
  TripMember,
} from "../modules/_shared/model";
import type { InvitationShareChannel } from "../modules/invitation-sharing";
import {
  colors,
  componentMetrics,
  layout,
  radius,
  shadows,
  spacing,
  zIndex,
} from "../theme";
import {
  AppText,
  Badge,
  Button,
  Icon,
  IconButton,
  InlineMessage,
  Input,
} from "../ui";
import {
  buildInvitationDeepLink,
  describeMember,
  isInvitationEmailValid,
  isInvitationShareReady,
  normalizeInvitationEmail,
} from "./invite-family-model";

export interface InviteFamilyScreenProps {
  members: TripMember[];
  invitation: TripInvitation | null;
  loading: boolean;
  error?: string | null;
  onBack: () => void;
  onInvite: (email: string) => Promise<void>;
  onShareInvitation: (
    channel: InvitationShareChannel,
    email?: string,
  ) => Promise<void>;
  onContinue: () => void;
}

type Tone = "accent" | "teal" | "gold";

const contactPreviews = [
  { initials: "SL", label: "Sophie", tone: "teal" as const },
  { initials: "ML", label: "Marc", tone: "teal" as const },
  { initials: "EL", label: "Emma", tone: "gold" as const },
  { initials: "LL", label: "Lucas", tone: "accent" as const },
];

export function InviteFamilyScreen({
  members,
  invitation,
  loading,
  error,
  onBack,
  onInvite,
  onShareInvitation,
  onContinue,
}: InviteFamilyScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [attempted, setAttempted] = useState(false);
  const emailIsValid = isInvitationEmailValid(email);
  const shareReady = isInvitationShareReady(invitation, email);
  const shareEmail = invitation ? undefined : normalizeInvitationEmail(email);
  const deepLink = invitation ? buildInvitationDeepLink(invitation) : null;
  const headerInsetStyle = useMemo(
    () => ({ paddingTop: Math.max(insets.top, spacing.lg) }),
    [insets.top],
  );
  const footerInsetStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, spacing.lg) }),
    [insets.bottom],
  );

  const submitInvitation = async () => {
    setAttempted(true);
    if (!emailIsValid) return;
    await onInvite(normalizeInvitationEmail(email));
  };

  const visibleMembers = members.length > 0 ? members : [];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, headerInsetStyle]}>
          <IconButton
            icon={<Icon name="arrow-left" size={20} />}
            onPress={onBack}
            accessibilityLabel="Retour"
          />
          <AppText variant="h2" style={styles.headerTitle}>
            Inviter la famille
          </AppText>
        </View>

        <AppText variant="bodySmall" color="muted" style={styles.subtitle}>
          Partagez ce Voyage avec un proche. Le second Compte pourra préparer
          et consulter les informations utiles avec vous.
        </AppText>

        <ComingSoonSection title="Votre tribu">
          <View style={styles.familyTree}>
            <View style={styles.treeRow}>
              <TreeNode initials="AL" label="Papa" tone="accent" />
              <View style={styles.horizontalConnector} />
              <TreeNode initials="SL" label="Maman" tone="teal" />
            </View>
            <View style={styles.verticalConnector} />
            <View style={styles.treeRow}>
              <TreeNode initials="EL" label="Emma" tone="gold" />
              <TreeNode initials="LL" label="Lucas" tone="accent" />
            </View>
            <View style={styles.verticalConnector} />
            <TreeNode initials="ML" label="Papi" tone="teal" />
          </View>
        </ComingSoonSection>

        <View style={styles.inviteLinkCard}>
          <Icon name="copy" size={20} color={colors.teal} />
          <AppText
            variant="bodySmall"
            color="teal"
            numberOfLines={2}
            style={styles.linkText}
          >
            {deepLink ?? "Le lien apparaîtra après la création de l’invitation"}
          </AppText>
          <Button
            size="sm"
            disabled={!shareReady || loading}
            onPress={() => {
              if (shareReady) void onShareInvitation("system", shareEmail);
            }}
          >
            Partager
          </Button>
        </View>

        <Section title="Canaux d’invitation">
          <View style={styles.shareRow}>
            <ShareChannel
              icon="message-circle"
              label="WhatsApp"
              tone="teal"
              disabled={!shareReady || loading}
              onPress={() => {
                if (shareReady) void onShareInvitation("whatsapp", shareEmail);
              }}
            />
            <ShareChannel
              icon="message-circle"
              label="SMS"
              tone="accent"
              disabled={!shareReady || loading}
              onPress={() => {
                if (shareReady) void onShareInvitation("sms", shareEmail);
              }}
            />
            <ShareChannel
              icon="copy"
              label="Partage"
              tone="gold"
              disabled={!shareReady || loading}
              onPress={() => {
                if (shareReady) void onShareInvitation("system", shareEmail);
              }}
            />
          </View>
          <AppText variant="caption" color="muted" style={styles.shareHint}>
            {shareReady
              ? deepLink
                ? "Choisissez un canal pour transmettre le lien privé."
                : "Choisissez un canal pour créer l’invitation et transmettre le lien."
              : "Saisissez une adresse e-mail valide pour activer les canaux."}
          </AppText>
        </Section>

        <ComingSoonSection title="Contacts récents">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.contactsRow}
          >
            {contactPreviews.map((contact) => (
              <View key={contact.label} style={styles.contactChip}>
                <AvatarBubble initials={contact.initials} tone={contact.tone} size="large" />
                <AppText variant="caption" color="muted" align="center">
                  {contact.label}
                </AppText>
              </View>
            ))}
            <Pressable
              disabled
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              style={styles.contactChip}
            >
              <View style={styles.addContactAvatar}>
                <Icon name="plus" size={20} color={colors.muted} />
              </View>
              <AppText variant="caption" color="muted" align="center">
                Autre
              </AppText>
            </Pressable>
          </ScrollView>
        </ComingSoonSection>

        <View style={styles.refreshIndicator}>
          <View style={styles.refreshDot} />
          <AppText variant="caption" color="muted">
            Synchronisation sécurisée
          </AppText>
        </View>

        <Section title="Membres du voyage">
          <View style={styles.memberList}>
            {visibleMembers.map((member, index) => (
              <MemberRow key={member.accountId} member={member} index={index} />
            ))}
            {invitation ? (
              <View style={styles.memberItem}>
                <AvatarBubble
                  initials={invitation.invitedEmail.slice(0, 2).toUpperCase()}
                  tone="gold"
                />
                <View style={styles.memberInfo}>
                  <AppText variant="label" numberOfLines={1}>
                    {invitation.invitedEmail}
                  </AppText>
                  <AppText variant="caption" color="muted">
                    Compte éditeur invité
                  </AppText>
                </View>
                <Badge
                  label={invitation.status === "accepted" ? "Actif" : "Invité"}
                  variant={invitation.status === "accepted" ? "success" : "gold"}
                />
              </View>
            ) : null}
          </View>
        </Section>

        <View style={styles.addMemberSection}>
          <View style={styles.addMemberForm}>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="Adresse e-mail du second Compte…"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={() => void submitInvitation()}
              error={
                attempted && !emailIsValid
                  ? "Saisissez une adresse e-mail valide."
                  : undefined
              }
              containerStyle={styles.addMemberInput}
            />
            <IconButton
              icon={<Icon name="plus" size={22} color={colors.white} />}
              onPress={() => void submitInvitation()}
              disabled={loading || !emailIsValid}
              accessibilityLabel="Créer l’invitation"
              style={styles.addMemberButton}
            />
          </View>
          {error ? (
            <InlineMessage
              variant="error"
              title="Invitation impossible"
              message={error}
            />
          ) : null}
          {invitation ? (
            <InlineMessage
              variant="success"
              title="Invitation prête"
              message="Le lien privé expire après 7 jours et donne uniquement le rôle éditeur."
            />
          ) : null}
        </View>

        <ComingSoonSection title="Rôles & permissions">
          <View style={styles.permissionsCard}>
            <PermissionRow
              icon="image"
              title="Lieux enregistrés"
              description="Ajouter et consulter les lieux du Voyage"
              badge="Éditeur"
              tone="teal"
            />
            <PermissionRow
              icon="file-text"
              title="Itinéraire & réservations"
              description="Modifier le programme et les réservations"
              badge="Éditeur"
              tone="accent"
            />
            <PermissionRow
              icon="wallet"
              title="Budget global"
              description="Consulter et modifier le budget du Voyage"
              badge="Éditeur"
              tone="gold"
              last
            />
          </View>
        </ComingSoonSection>

        <ComingSoonSection title="Rappels automatiques">
          <View style={styles.reminderCard}>
            <View style={styles.reminderIcon}>
              <Icon name="clock" size={20} color={colors.accent} />
            </View>
            <View style={styles.reminderInfo}>
              <AppText variant="label">Rappeler l’invité dans 2 jours</AppText>
              <AppText variant="caption" color="muted">
                Notification envoyée automatiquement
              </AppText>
            </View>
            <View style={styles.switchPreview}>
              <View style={styles.switchThumb} />
            </View>
          </View>
        </ComingSoonSection>
      </ScrollView>

      <View style={[styles.footer, footerInsetStyle]}>
        <Button fullWidth onPress={onContinue}>
          Lancer le voyage
        </Button>
        <Button variant="secondary" onPress={onContinue}>
          Passer
        </Button>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="sectionTitle" color="muted" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

function ComingSoonSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Section title={title}>
      <View
        accessible
        accessibilityLabel={`${title}, à venir`}
        accessibilityState={{ disabled: true }}
        style={styles.comingSoonFrame}
      >
        <View pointerEvents="none" style={styles.comingSoonContent}>
          {children}
        </View>
        <Badge label="À venir" variant="gold" style={styles.comingSoonBadge} />
      </View>
    </Section>
  );
}

function AvatarBubble({
  initials,
  tone,
  size = "standard",
}: {
  initials: string;
  tone: Tone;
  size?: "standard" | "large";
}) {
  return (
    <View
      style={[
        styles.avatar,
        size === "large" && styles.avatarLarge,
        styles[`${tone}Soft`],
      ]}
    >
      <AppText variant="caption" style={styles[`${tone}Text`]}>
        {initials}
      </AppText>
    </View>
  );
}

function TreeNode({
  initials,
  label,
  tone,
}: {
  initials: string;
  label: string;
  tone: Tone;
}) {
  return (
    <View style={styles.treeNode}>
      <View style={[styles.treeAvatar, styles[`${tone}Background`]]}>
        <AppText variant="caption" color="onAccent">
          {initials}
        </AppText>
      </View>
      <AppText variant="caption" color="muted">
        {label}
      </AppText>
    </View>
  );
}

function ShareChannel({
  icon,
  label,
  tone,
  disabled,
  onPress,
}: {
  icon: "message-circle" | "mail" | "copy";
  label: string;
  tone: Tone;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Partager par ${label}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shareButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={[styles.shareIcon, styles[`${tone}Soft`]]}>
        <Icon name={icon} size={20} color={colors[tone]} />
      </View>
      <AppText variant="caption">{label}</AppText>
    </Pressable>
  );
}

function MemberRow({ member, index }: { member: TripMember; index: number }) {
  const description = describeMember(member, index);
  const tone: Tone = member.role === "owner" ? "accent" : "teal";
  return (
    <View style={styles.memberItem}>
      <AvatarBubble initials={`C${index + 1}`} tone={tone} />
      <View style={styles.memberInfo}>
        <AppText variant="label">{description.name}</AppText>
        <AppText variant="caption" color="muted">
          {description.role}
        </AppText>
      </View>
      <Badge
        label={description.status}
        variant={member.role === "owner" ? "accent" : "teal"}
      />
    </View>
  );
}

function PermissionRow({
  icon,
  title,
  description,
  badge,
  tone,
  last = false,
}: {
  icon: "image" | "file-text" | "wallet";
  title: string;
  description: string;
  badge: string;
  tone: Tone;
  last?: boolean;
}) {
  return (
    <View style={[styles.permissionRow, last && styles.permissionRowLast]}>
      <View style={[styles.permissionIcon, styles[`${tone}Soft`]]}>
        <Icon name={icon} size={20} color={colors[tone]} />
      </View>
      <View style={styles.permissionInfo}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption" color="muted">
          {description}
        </AppText>
      </View>
      <Badge label={badge} variant={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    width: "100%",
    maxWidth: layout.maxMobileWidth,
    alignSelf: "center",
    paddingBottom: spacing["2xl"] * 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: { flex: 1 },
  subtitle: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: { marginBottom: spacing.md },
  comingSoonFrame: { position: "relative" },
  comingSoonContent: {
    opacity: componentMetrics.inviteFamily.comingSoonOpacity,
  },
  comingSoonBadge: {
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    zIndex: zIndex.sticky,
  },
  familyTree: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  treeRow: {
    flexDirection: "row",
    gap: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  treeNode: { alignItems: "center", gap: spacing.xs },
  treeAvatar: {
    width: layout.minimumTouchTarget,
    height: layout.minimumTouchTarget,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  horizontalConnector: {
    width: layout.minimumTouchTarget,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  verticalConnector: {
    width: StyleSheet.hairlineWidth,
    height: spacing.md,
    backgroundColor: colors.border,
  },
  inviteLinkCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.tealSoft,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  linkText: { flex: 1 },
  shareRow: { flexDirection: "row", gap: spacing.md },
  shareHint: { marginTop: spacing.sm },
  shareButton: {
    flex: 1,
    minHeight: spacing["2xl"] * 2,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  shareIcon: {
    width: layout.minimumTouchTarget,
    height: layout.minimumTouchTarget,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  contactsRow: { gap: spacing.md, paddingBottom: spacing.sm },
  contactChip: {
    width: spacing["2xl"] + spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  addContactAvatar: {
    width: spacing["2xl"] + spacing.xs,
    height: spacing["2xl"] + spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  refreshDot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  memberList: { gap: spacing.sm },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  memberInfo: { flex: 1, gap: spacing.xs },
  avatar: {
    width: layout.minimumTouchTarget,
    height: layout.minimumTouchTarget,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLarge: {
    width: spacing["2xl"] + spacing.xs,
    height: spacing["2xl"] + spacing.xs,
  },
  accentSoft: { backgroundColor: colors.accentSoft },
  tealSoft: { backgroundColor: colors.tealSoft },
  goldSoft: { backgroundColor: colors.goldSoft },
  accentBackground: { backgroundColor: colors.accent },
  tealBackground: { backgroundColor: colors.teal },
  goldBackground: { backgroundColor: colors.gold },
  accentText: { color: colors.accent },
  tealText: { color: colors.teal },
  goldText: { color: colors.gold },
  addMemberSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  addMemberForm: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  addMemberInput: { flex: 1 },
  addMemberButton: {
    width: spacing["2xl"],
    height: spacing["2xl"],
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    borderWidth: 0,
    ...shadows.accent,
  },
  permissionsCard: {
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  permissionRowLast: { borderBottomWidth: 0 },
  permissionIcon: {
    width: layout.minimumTouchTarget,
    height: layout.minimumTouchTarget,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionInfo: { flex: 1, gap: spacing.xs },
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  reminderIcon: {
    width: layout.minimumTouchTarget,
    height: layout.minimumTouchTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderInfo: { flex: 1, gap: spacing.xs },
  switchPreview: {
    width: spacing["2xl"],
    height: spacing.xl - spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    padding: spacing.xs,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  switchThumb: {
    width: spacing.lg - spacing.xs,
    height: spacing.lg - spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: componentMetrics.inviteFamily.disabledOpacity },
  pressed: { transform: [{ scale: 0.97 }] },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxWidth: layout.maxMobileWidth,
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    zIndex: zIndex.sticky,
  },
});

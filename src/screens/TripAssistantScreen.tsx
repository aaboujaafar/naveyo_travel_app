import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SuggestionDraft } from "../modules/trip-assistant";
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
  Chip,
  Icon,
  IconButton,
  InlineMessage,
  Input,
  Skeleton,
} from "../ui";
import {
  buildAssistantPreferences,
  isAssistantSearchReady,
  type AssistantCategory,
  type AssistantSearchValues,
} from "./trip-assistant-model";

export interface TripAssistantScreenProps {
  stopName?: string;
  drafts: SuggestionDraft[];
  loading: boolean;
  assistantAvailable: boolean;
  error?: string | null;
  onDiscover: (values: AssistantSearchValues) => Promise<void>;
  onBack: () => void;
  onOpenTrip: () => void;
}

const categories: AssistantCategory[] = [
  "Restaurants",
  "À voir",
  "Hébergements",
  "Activités",
];

export function TripAssistantScreen({
  stopName,
  drafts,
  loading,
  assistantAvailable,
  error,
  onDiscover,
  onBack,
  onOpenTrip,
}: TripAssistantScreenProps) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<AssistantSearchValues>({
    query: "",
    category: "Restaurants",
  });
  const ready = isAssistantSearchReady(values);
  const headerInsetStyle = useMemo(
    () => ({ paddingTop: Math.max(insets.top, spacing.lg) }),
    [insets.top],
  );
  const navigationInsetStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, spacing.sm) }),
    [insets.bottom],
  );

  const discover = async () => {
    if (!ready || !assistantAvailable || loading) return;
    await onDiscover(values);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, headerInsetStyle]}>
          <View style={styles.headerRow}>
            <IconButton
              icon={<Icon name="arrow-left" size={20} />}
              onPress={onBack}
              accessibilityLabel="Retour à l’Étape"
            />
            <View style={styles.headerText}>
              <AppText variant="h2">
                Explorer {stopName ?? "cette Étape"}
              </AppText>
              <AppText variant="bodySmall" color="muted">
                Naveyo classe de vrais lieux selon les préférences du Voyage.
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Input
            value={values.query}
            onChangeText={(query) =>
              setValues((current) => ({ ...current, query }))
            }
            placeholder="Chercher un lieu ou une activité…"
            returnKeyType="search"
            onSubmitEditing={() => void discover()}
            leftIcon={<Icon name="search" size={20} color={colors.muted} />}
            containerStyle={styles.searchInput}
          />
          <IconButton
            icon={<Icon name="search" size={20} color={colors.white} />}
            onPress={() => void discover()}
            disabled={!ready || !assistantAvailable || loading}
            accessibilityLabel="Lancer la recherche de lieux"
            style={styles.searchButton}
          />
        </View>

        <ComingSoonFrame label="Affichage et tri">
          <View style={styles.controlsRow}>
            <View style={styles.viewToggle}>
              <View style={styles.viewToggleActive}>
                <Icon name="layers" size={16} color={colors.white} />
                <AppText variant="caption" color="onAccent">
                  Liste
                </AppText>
              </View>
              <View style={styles.viewToggleButton}>
                <Icon name="map" size={16} color={colors.muted} />
                <AppText variant="caption" color="muted">
                  Carte
                </AppText>
              </View>
            </View>
            <View style={styles.sortSelect}>
              <AppText variant="caption">Pertinence</AppText>
              <Icon name="chevron-down" size={16} />
            </View>
          </View>
        </ComingSoonFrame>

        {loading ? <LoadingResults /> : null}

        {loading ? (
          <View style={styles.aiTyping} accessibilityRole="progressbar">
            <View style={styles.typingDots}>
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
            </View>
            <AppText variant="bodySmall" color="teal">
              L’IA classe les candidats vérifiés…
            </AppText>
          </View>
        ) : null}

        {error ? (
          <View style={styles.horizontalSection}>
            <InlineMessage
              variant="error"
              title="Recherche impossible"
              message={error}
            />
          </View>
        ) : null}

        {!assistantAvailable ? (
          <View style={styles.horizontalSection}>
            <InlineMessage
              variant="error"
              title="Suggestions indisponibles"
              message="Le Module Suggestions IA n’est pas disponible dans cette session."
            />
          </View>
        ) : null}

        <Section title="Suggestions personnalisées">
          {drafts.length > 0 ? (
            <View style={styles.suggestionList}>
              {drafts.map((draft) => (
                <SuggestionCard key={draft.id} draft={draft} />
              ))}
            </View>
          ) : !loading && !error ? (
            <View style={styles.emptyCard}>
              <View style={styles.aiSpark}>
                <Icon name="sparkles" size={20} color={colors.teal} />
              </View>
              <View style={styles.emptyText}>
                <AppText variant="label">Aucune suggestion pour l’instant</AppText>
                <AppText variant="caption" color="muted">
                  Lancez une recherche pour obtenir jusqu’à cinq brouillons.
                </AppText>
              </View>
            </View>
          ) : null}
        </Section>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((category) => (
            <Chip
              key={category}
              label={category}
              active={values.category === category}
              onPress={() =>
                setValues((current) => ({ ...current, category }))
              }
            />
          ))}
        </ScrollView>

        <View style={styles.preferenceSummary}>
          <Icon name="info" size={16} color={colors.teal} />
          <AppText variant="caption" color="teal">
            Préférence envoyée : {buildAssistantPreferences(values.category)}
          </AppText>
        </View>

        <ComingSoonSection title="Filtres avancés">
          <AppText variant="caption" color="muted" style={styles.filterLabel}>
            RAYON DE RECHERCHE
          </AppText>
          <View style={styles.wrapRow}>
            {['500 m', '1 km', '2 km', '5 km'].map((label, index) => (
              <Chip key={label} label={label} active={index === 1} />
            ))}
          </View>
          <AppText variant="caption" color="muted" style={styles.filterLabel}>
            OPTIONS
          </AppText>
          <View style={styles.wrapRow}>
            {['Adapté aux enfants', '€', '€€', '€€€'].map((label, index) => (
              <Chip key={label} label={label} active={index === 0 || index === 2} />
            ))}
          </View>
        </ComingSoonSection>

        <ComingSoonSection title="Vue carte">
          <View style={styles.mapPreview}>
            <Icon name="map" size={32} color={colors.teal} />
            <AppText variant="bodySmall" color="teal" align="center">
              Les candidats pourront être affichés sur la carte.
            </AppText>
          </View>
        </ComingSoonSection>

        <Section title={`Résultats vérifiés${stopName ? ` · ${stopName}` : ""}`}>
          <View style={styles.resultsList}>
            {drafts.map((draft) => (
              <ResultCard key={`result-${draft.id}`} draft={draft} />
            ))}
            {drafts.length === 0 ? (
              <View style={styles.resultPlaceholder}>
                <View style={styles.resultThumbPlaceholder}>
                  <Icon name="map-pin" size={24} color={colors.muted} />
                </View>
                <View style={styles.resultBody}>
                  <AppText variant="label">Candidats de lieux</AppText>
                  <AppText variant="caption" color="muted">
                    Les lieux validés par le fournisseur apparaîtront ici.
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>
        </Section>

        <ComingSoonSection title="Conversation IA">
          <View style={styles.chatContainer}>
            <View style={styles.chatMessageUser}>
              <View style={styles.chatAvatarUser}>
                <AppText variant="badge" color="accent">SL</AppText>
              </View>
              <View style={styles.chatBubbleUser}>
                <AppText variant="caption" color="onAccent">
                  Un endroit pour le goûter près de Belém ?
                </AppText>
              </View>
            </View>
            <View style={styles.chatMessageAi}>
              <View style={styles.chatAvatarAi}>
                <Icon name="sparkles" size={14} color={colors.teal} />
              </View>
              <View style={styles.chatBubbleAi}>
                <AppText variant="caption">
                  Les Suggestions IA V0 restent des brouillons de lieux, sans conversation libre.
                </AppText>
              </View>
            </View>
            <View style={styles.chatInputPreview}>
              <AppText variant="caption" color="muted">
                Posez une question à l’IA…
              </AppText>
              <View style={styles.chatSendPreview}>
                <Icon name="arrow-right" size={16} color={colors.white} />
              </View>
            </View>
          </View>
        </ComingSoonSection>

        <ComingSoonFrame label="Itinéraire IA du jour">
          <View style={styles.aiBanner}>
            <View style={styles.aiBannerTitle}>
              <Icon name="layers" size={20} color={colors.teal} />
              <AppText variant="label" style={styles.aiBannerTitleText}>
                Itinéraire IA du jour
              </AppText>
              <Icon name="chevron-down" size={16} />
            </View>
            <AppText variant="bodySmall" color="muted">
              Un parcours complet composé automatiquement dépasse le périmètre V0.
            </AppText>
            <Button disabled onPress={() => undefined}>
              Voir le parcours
            </Button>
          </View>
        </ComingSoonFrame>

        <ComingSoonSection title="Recherches récentes">
          <View style={styles.wrapRow}>
            {['pastéis de nata', 'parking Belém', 'plage enfants'].map((label) => (
              <Chip key={label} label={label} icon={<Icon name="clock" size={14} />} />
            ))}
          </View>
        </ComingSoonSection>

        <ComingSoonSection title="Coups de cœur famille">
          <FavoritePreview title="Miradouro da Graça" detail="Ajouté par Sophie · Vue panoramique" />
          <FavoritePreview title="LX Factory" detail="Ajouté par Emma · Art urbain & boutiques" />
        </ComingSoonSection>

        <View style={styles.safetyNote}>
          <Icon name="info" size={16} color={colors.gold} />
          <AppText variant="caption" color="muted" style={styles.safetyText}>
            Chaque résultat est un brouillon lié à un candidat réel. Rien n’est ajouté automatiquement à l’itinéraire.
          </AppText>
        </View>
      </ScrollView>

      <View style={[styles.bottomNav, navigationInsetStyle]}>
        <BottomNavItem icon="home" label="Accueil" onPress={onOpenTrip} />
        <BottomNavItem icon="search" label="Explorer" active />
        <BottomNavItem icon="image" label="Photos" comingSoon />
        <BottomNavItem icon="file-text" label="Journal" comingSoon />
        <BottomNavItem icon="layers" label="Récap" comingSoon />
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

function ComingSoonFrame({
  label,
  children,
  embedded = false,
}: {
  label: string;
  children: React.ReactNode;
  embedded?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}, à venir`}
      accessibilityState={{ disabled: true }}
      style={[
        styles.comingSoonFrame,
        embedded && styles.comingSoonFrameEmbedded,
      ]}
    >
      <View pointerEvents="none" style={styles.comingSoonContent}>{children}</View>
      <Badge label="À venir" variant="gold" style={styles.comingSoonBadge} />
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
      <ComingSoonFrame label={title} embedded>{children}</ComingSoonFrame>
    </Section>
  );
}

function SuggestionCard({ draft }: { draft: SuggestionDraft }) {
  return (
    <View style={styles.suggestionCard}>
      <View style={styles.aiSpark}>
        <Icon name="sparkles" size={20} color={colors.teal} />
      </View>
      <View style={styles.suggestionBody}>
        <AppText variant="label">{draft.title}</AppText>
        <AppText variant="caption" color="muted">{draft.reason}</AppText>
      </View>
      <Badge label="Brouillon" variant="teal" />
    </View>
  );
}

function ResultCard({ draft }: { draft: SuggestionDraft }) {
  return (
    <View style={styles.resultCard}>
      <View style={styles.resultThumbPlaceholder}>
        <Icon name="map-pin" size={24} color={colors.teal} />
      </View>
      <View style={styles.resultBody}>
        <AppText variant="label">{draft.title}</AppText>
        <AppText variant="caption" color="muted" numberOfLines={2}>
          {draft.reason}
        </AppText>
        <View style={styles.resultTags}>
          <Badge label="Candidat vérifié" variant="success" />
          <Badge label="À confirmer" variant="gold" />
        </View>
      </View>
    </View>
  );
}

function LoadingResults() {
  return (
    <View style={styles.loadingContainer}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <Skeleton width={spacing["2xl"] + spacing.xl} height={spacing["2xl"] + spacing.xl} />
          <View style={styles.skeletonLines}>
            <Skeleton width="60%" height={spacing.sm + spacing.xs} />
            <Skeleton width="80%" height={spacing.sm + spacing.xs} />
            <Skeleton width="40%" height={spacing.sm + spacing.xs} />
          </View>
        </View>
      ))}
    </View>
  );
}

function FavoritePreview({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.favoriteCard}>
      <View style={styles.favoriteIcon}>
        <Icon name="sparkles" size={20} color={colors.accent} />
      </View>
      <View style={styles.favoriteBody}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption" color="muted">{detail}</AppText>
      </View>
      <Icon name="arrow-right" size={16} color={colors.muted} />
    </View>
  );
}

function BottomNavItem({
  icon,
  label,
  active = false,
  comingSoon = false,
  onPress,
}: {
  icon: "home" | "search" | "image" | "file-text" | "layers";
  label: string;
  active?: boolean;
  comingSoon?: boolean;
  onPress?: () => void;
}) {
  const disabled = comingSoon || !onPress;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${comingSoon ? ", à venir" : ""}`}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.bottomNavItem, comingSoon && styles.disabled]}
    >
      <Icon name={icon} size={20} color={active ? colors.accent : colors.muted} />
      <AppText variant="badge" color={active ? "accent" : "muted"}>{label}</AppText>
      {comingSoon ? <AppText variant="badge" color="gold">À venir</AppText> : null}
    </Pressable>
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
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  searchBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1 },
  searchButton: {
    width: spacing["2xl"] + spacing.xs,
    height: spacing["2xl"] + spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    borderWidth: 0,
    ...shadows.accent,
  },
  comingSoonFrame: {
    position: "relative",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  comingSoonFrameEmbedded: { marginHorizontal: 0, marginBottom: 0 },
  comingSoonContent: {
    opacity: componentMetrics.tripAssistant.comingSoonOpacity,
  },
  comingSoonBadge: {
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    zIndex: zIndex.sticky,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  viewToggle: {
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  viewToggleActive: {
    minHeight: layout.minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.fg,
  },
  viewToggleButton: {
    minHeight: layout.minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  sortSelect: {
    minHeight: layout.minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  loadingContainer: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  skeletonCard: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  skeletonLines: { flex: 1, gap: spacing.sm, justifyContent: "center" },
  aiTyping: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  typingDots: { flexDirection: "row", gap: spacing.xs },
  typingDot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.teal,
  },
  horizontalSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  suggestionList: { gap: spacing.sm },
  suggestionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  aiSpark: {
    width: layout.minimumTouchTarget,
    height: layout.minimumTouchTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionBody: { flex: 1, gap: spacing.xs },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  emptyText: { flex: 1, gap: spacing.xs },
  categoryScroll: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  preferenceSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  filterLabel: { marginBottom: spacing.sm },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  mapPreview: {
    minHeight: spacing["2xl"] * 4,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.tealSoft,
  },
  resultsList: { gap: spacing.sm },
  resultCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  resultPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  resultThumbPlaceholder: {
    width: spacing["2xl"] + spacing.xl,
    height: spacing["2xl"] + spacing.xl,
    borderRadius: radius.sm,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBody: { flex: 1, justifyContent: "center", gap: spacing.xs },
  resultTags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chatContainer: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  chatMessageUser: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.sm },
  chatMessageAi: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  chatAvatarUser: {
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  chatAvatarAi: {
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: radius.full,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  chatBubbleUser: {
    maxWidth: "80%",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  chatBubbleAi: {
    maxWidth: "80%",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chatInputPreview: {
    minHeight: layout.minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chatSendPreview: {
    width: layout.minimumTouchTarget,
    height: layout.minimumTouchTarget,
    borderRadius: radius.full,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  aiBanner: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.tealSoft,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.teal,
  },
  aiBannerTitle: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  aiBannerTitleText: { flex: 1 },
  favoriteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  favoriteIcon: {
    width: layout.minimumTouchTarget,
    height: layout.minimumTouchTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteBody: { flex: 1, gap: spacing.xs },
  safetyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.goldSoft,
  },
  safetyText: { flex: 1 },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxWidth: layout.maxMobileWidth,
    alignSelf: "center",
    flexDirection: "row",
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    zIndex: zIndex.sticky,
    ...shadows.sm,
  },
  bottomNavItem: {
    flex: 1,
    minHeight: spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  disabled: { opacity: componentMetrics.tripAssistant.disabledOpacity },
});

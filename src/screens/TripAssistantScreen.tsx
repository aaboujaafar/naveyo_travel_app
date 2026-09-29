import { useMemo, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PlaceCandidate } from "../modules/_shared/model";
import { DEFAULT_GEOAPIFY_ATTRIBUTION, placeAttribution } from "../modules/places";
import type { SuggestionDraft, SuggestionWeatherContext } from "../modules/trip-assistant";
import { ExpoMapsView } from "../adapters/map/expo-maps-view";
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
  Chip,
  Icon,
  IconButton,
  InlineMessage,
  Input,
  Skeleton,
} from "../ui";
import {
  isAssistantSearchReady,
  type AssistantCategory,
  type AssistantSearchValues,
  ASSISTANT_RADII,
} from "./trip-assistant-model";

export interface TripAssistantScreenProps {
  stopName?: string;
  drafts: SuggestionDraft[];
  nearbyCandidates?: PlaceCandidate[];
  loading: boolean;
  assistantAvailable: boolean;
  error?: string | null;
  onDiscover: (values: AssistantSearchValues) => Promise<void>;
  onOpenPlace?: (placeId: PlaceCandidate["id"]) => void;
  onBack: () => void;
  onOpenTrip: () => void;
  planningContext?: { weather: SuggestionWeatherContext[]; plannedCount: number };
  dayPlanSection?: React.ReactNode;
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
  nearbyCandidates = [],
  loading,
  assistantAvailable,
  error,
  onDiscover,
  onOpenPlace,
  onBack,
  onOpenTrip,
  planningContext,
  dayPlanSection,
}: TripAssistantScreenProps) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<AssistantSearchValues>({
    query: "",
    category: "Restaurants",
    radiusMeters: 1_000,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    if (!ready || loading) return;
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
              <AppText variant="caption" color="teal">EXPLORER · {stopName ?? "VOTRE ÉTAPE"}</AppText>
              <AppText variant="h1">Que voulez-vous découvrir ?</AppText>
              <AppText variant="bodySmall" color="muted">Des lieux vérifiés et des idées adaptées à votre Voyage.</AppText>
            </View>
          </View>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchBar}>
            <Input
              value={values.query}
              onChangeText={(query) => setValues((current) => ({ ...current, query }))}
              placeholder="Musée, restaurant, randonnée…"
              returnKeyType="search"
              onSubmitEditing={() => void discover()}
              leftIcon={<Icon name="search" size={20} color={colors.muted} />}
              containerStyle={styles.searchInput}
            />
          </View>
          <IconButton
            icon={<Icon name="search" size={20} color={colors.white} />}
            onPress={() => void discover()}
            disabled={!ready || loading}
            accessibilityLabel="Lancer la recherche de lieux"
            style={styles.searchButton}
          />
          <AppText variant="caption" color="muted" style={styles.searchHint}>Recherche autour de {stopName ?? "l’étape sélectionnée"}</AppText>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((category) => <Chip key={category} label={category} active={values.category === category} onPress={() => setValues((current) => ({ ...current, category }))} />)}
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen((open) => !open)} style={styles.filterButton}>
            <Icon name="settings" size={16} color={colors.teal} /><AppText variant="caption" color="teal">Filtres</AppText>
          </Pressable>
        </ScrollView>

        {filtersOpen ? <View style={styles.filterCard}>
          <AppText variant="label">Rayon de recherche</AppText>
          <View style={styles.wrapRow}>{ASSISTANT_RADII.map((radiusMeters) => <Chip key={radiusMeters} label={formatRadius(radiusMeters)} active={values.radiusMeters === radiusMeters} onPress={() => setValues((current) => ({ ...current, radiusMeters }))} />)}</View>
        </View> : null}

        <View style={styles.contextCard}>
          <View style={styles.contextIcon}><Icon name="sparkles" size={16} color={colors.teal} /></View>
          <View style={styles.contextText}>
            <AppText variant="label">Analyse intelligente activée</AppText>
            <AppText variant="caption" color="muted">L’assistant tient compte de la météo et de vos {planningContext?.plannedCount ?? 0} activité{planningContext?.plannedCount === 1 ? "" : "s"} déjà prévue{planningContext?.plannedCount === 1 ? "" : "s"}.</AppText>
          </View>
          <Badge label={planningContext?.weather.length ? "Météo prête" : "Météo en attente"} variant={planningContext?.weather.length ? "teal" : "gold"} />
        </View>

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
                <SuggestionCard key={draft.id} draft={draft} onPlan={onOpenPlace ? () => onOpenPlace(draft.candidateId) : undefined} />
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

        {dayPlanSection}

        <Section title="Carte des lieux">
          <View style={styles.mapPreview}>
            {nearbyCandidates.length > 0 ? <ExpoMapsView model={{ points: nearbyCandidates.filter((place) => place.coordinates).map((place) => ({ id: place.id, label: place.name, coordinates: place.coordinates })) }} style={styles.mapSurface} /> : <><Icon name="map" size={32} color={colors.teal} /><AppText variant="bodySmall" color="teal" align="center">Lancez une recherche pour afficher les lieux.</AppText></>}
          </View>
        </Section>

        <Section title={`Lieux à découvrir${stopName ? ` · ${stopName}` : ""}`}>
          <View style={styles.resultsList}>
            {nearbyCandidates.map((place) => (
              <ResultCard key={`place-${place.id}`} place={place} onPress={onOpenPlace ? () => onOpenPlace(place.id) : undefined} />
            ))}
            {nearbyCandidates.length === 0 ? (
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

function SuggestionCard({ draft, onPlan }: { draft: SuggestionDraft; onPlan?: () => void }) {
  return (
    <View style={styles.suggestionCard}>
      <View style={styles.aiSpark}>
        <Icon name="sparkles" size={20} color={colors.teal} />
      </View>
      <View style={styles.suggestionBody}>
        <AppText variant="label">{draft.title}</AppText>
        <AppText variant="caption" color="muted">{draft.reason}</AppText>
        {onPlan ? <Pressable accessibilityRole="button" onPress={onPlan} style={styles.planLink}><Icon name="calendar" size={14} color={colors.teal} /><AppText variant="caption" color="teal">Voir et planifier</AppText></Pressable> : null}
      </View>
      <Badge label="Brouillon" variant="teal" />
    </View>
  );
}

function ResultCard({ place, onPress }: { place: PlaceCandidate; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={!onPress} style={styles.resultCard}>
      <Image source={placeImageSource(place)} style={styles.resultImage} resizeMode="cover" />
      <View style={styles.resultBody}>
        <AppText variant="label">{place.name}</AppText>
        <AppText variant="caption" color="muted" numberOfLines={2}>
          {[place.category, place.address, place.distanceMeters != null ? formatDistance(place.distanceMeters) : null].filter(Boolean).join(" · ") || "Lieu fourni par Geoapify"}
        </AppText>
        {place.imageCredit ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(place.imageCredit?.photographerUrl ?? place.imageCredit?.sourceUrl ?? "")}
          >
            <AppText variant="badge" color="muted">
              Photo par {place.imageCredit.photographer} · Unsplash
            </AppText>
          </Pressable>
        ) : null}
        <View style={styles.resultTags}>
          <Badge label="Candidat vérifié" variant="success" />
          <Badge label={placeAttribution(place.provider, place.attribution) ?? DEFAULT_GEOAPIFY_ATTRIBUTION} variant="gold" />
        </View>
      </View>
    </Pressable>
  );
}

function formatRadius(value: number): string { return value >= 1_000 ? `${value / 1_000} km` : `${value} m`; }
function formatDistance(value: number): string { return value >= 1_000 ? `${(value / 1_000).toFixed(1)} km` : `${Math.round(value)} m`; }
function placeImageSource(place: PlaceCandidate) {
  if (place.imageUrl) return { uri: place.imageUrl };
  const category = place.category?.toLowerCase() ?? "";
  if (category.includes("restaurant") || category.includes("catering")) return require("../../assets/restaurant-detail.png");
  return category.includes("activity") || category.includes("sport") ? require("../../assets/photo-album-3.png") : require("../../assets/photo-album-2.png");
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
  if (comingSoon) return null;
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
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  headerText: { flex: 1, gap: spacing.xs, paddingTop: spacing.xs },
  searchCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadows.sm },
  searchBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
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
  searchHint: { marginTop: spacing.sm, paddingLeft: spacing.xs },
  filterButton: { minHeight: layout.minimumTouchTarget, flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.teal, backgroundColor: colors.tealSoft },
  filterCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  contextCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tealSoft, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.teal },
  contextIcon: { width: spacing.xl, height: spacing.xl, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  contextText: { flex: 1, gap: spacing.xs },
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
  planLink: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", marginTop: spacing.xs },
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
  mapSurface: { width: "100%", height: spacing["2xl"] * 5, borderRadius: radius.md },
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
  resultImage: { width: spacing["2xl"] + spacing.xl, height: spacing["2xl"] + spacing.xl, borderRadius: radius.sm, backgroundColor: colors.tealSoft },
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

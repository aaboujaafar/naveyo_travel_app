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
  layout,
  radius,
  shadows,
  spacing,
} from "../theme";
import {
  AppText,
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
  /** Absent when the screen is a tab: the tab bar is the way out. */
  onBack?: () => void;
  planningContext?: { weather: SuggestionWeatherContext[]; plannedCount: number };
  dayPlanSection?: React.ReactNode;
  /** Mode asked for by a link (e.g. the dashboard's AI day card). */
  requestedMode?: "places" | "day";
}

const categories: AssistantCategory[] = [
  "Restaurants",
  "À voir",
  "Hébergements",
  "Activités",
];

type ExploreMode = "places" | "day";
type ResultsView = "list" | "map";

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
  planningContext,
  dayPlanSection,
  requestedMode,
}: TripAssistantScreenProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ExploreMode>(requestedMode ?? "day");
  // A new link asking for a mode wins over the tab's last state (adjusted during render).
  const [lastRequestedMode, setLastRequestedMode] = useState(requestedMode);
  if (requestedMode !== lastRequestedMode) {
    setLastRequestedMode(requestedMode);
    if (requestedMode) setMode(requestedMode);
  }
  const [resultsView, setResultsView] = useState<ResultsView>("list");
  const [searched, setSearched] = useState(false);
  const [values, setValues] = useState<AssistantSearchValues>({
    query: "",
    category: "Restaurants",
    radiusMeters: 1_000,
  });
  const ready = isAssistantSearchReady(values);
  const headerInsetStyle = useMemo(
    () => ({ paddingTop: Math.max(insets.top, spacing.lg) }),
    [insets.top],
  );
  const mappablePlaces = nearbyCandidates.filter((place) => place.coordinates);
  const attributions = Array.from(new Set(nearbyCandidates.map((place) => placeAttribution(place.provider, place.attribution) ?? DEFAULT_GEOAPIFY_ATTRIBUTION)));
  const plannedCount = planningContext?.plannedCount ?? 0;

  const discover = async (next: AssistantSearchValues = values) => {
    if (!isAssistantSearchReady(next) || loading) return;
    setSearched(true);
    await onDiscover(next);
  };

  // A category is a search on its own: picking one refreshes the results right away.
  const chooseCategory = (category: AssistantCategory) => {
    const next = { ...values, category };
    setValues(next);
    void discover(next);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, headerInsetStyle]}>
          {onBack ? <IconButton
            icon={<Icon name="arrow-left" size={20} />}
            onPress={onBack}
            accessibilityLabel="Retour à l’Étape"
          /> : null}
          <View style={styles.headerText}>
            <AppText variant="h1">Explorer</AppText>
            <View style={styles.stopLine}>
              <Icon name="map-pin" size={14} color={colors.muted} />
              <AppText variant="bodySmall" color="muted">{stopName ? `Autour de ${stopName}` : "Votre Étape"}</AppText>
            </View>
          </View>
        </View>

        <View style={styles.segmented} accessibilityRole="tablist">
          <SegmentButton label="Journée IA" icon="sparkles" active={mode === "day"} onPress={() => setMode("day")} />
          <SegmentButton label="Lieux" icon="search" active={mode === "places"} onPress={() => setMode("places")} />
        </View>

        {mode === "day" ? (
          <>
            <View style={styles.dayHero}>
              <View style={styles.dayHeroIcon}><Icon name="sparkles" size={22} color={colors.white} /></View>
              <View style={styles.dayHeroText}>
                <AppText variant="h3" color="onAccent">Votre journée, composée pour vous</AppText>
                <AppText variant="bodySmall" color="onAccent">
                  {`Choisissez un jour : l’IA assemble un programme à partir de lieux réels et de la météo${plannedCount > 0 ? ` et vos ${plannedCount} activité${plannedCount > 1 ? "s" : ""} déjà prévue${plannedCount > 1 ? "s" : ""}` : ""}.`}
                </AppText>
              </View>
            </View>
            {dayPlanSection ?? (
              <View style={styles.horizontalSection}>
                <InlineMessage title="Aucune Étape" message="Ajoutez une Étape pour composer une journée." />
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.searchBar}>
              <Input
                value={values.query}
                onChangeText={(query) => setValues((current) => ({ ...current, query }))}
                placeholder="Musée, tapas, point de vue…"
                returnKeyType="search"
                onSubmitEditing={() => void discover()}
                leftIcon={<Icon name="search" size={20} color={colors.muted} />}
                containerStyle={styles.searchInput}
                autoCorrect={false}
              />
              <IconButton
                icon={<Icon name="arrow-right" size={20} color={colors.white} />}
                onPress={() => void discover()}
                disabled={!ready || loading}
                accessibilityLabel="Lancer la recherche de lieux"
                style={styles.searchButton}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {categories.map((category) => <Chip key={category} label={category} active={values.category === category} onPress={() => chooseCategory(category)} />)}
            </ScrollView>

            <View style={styles.radiusRow}>
              <AppText variant="caption" color="muted">Rayon</AppText>
              {ASSISTANT_RADII.map((radiusMeters) => (
                <Pressable
                  key={radiusMeters}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: values.radiusMeters === radiusMeters }}
                  accessibilityLabel={`Rayon ${formatRadius(radiusMeters)}`}
                  onPress={() => setValues((current) => ({ ...current, radiusMeters }))}
                  style={[styles.radiusOption, values.radiusMeters === radiusMeters && styles.radiusOptionActive]}
                >
                  <AppText variant="caption" color={values.radiusMeters === radiusMeters ? "fg" : "muted"}>{formatRadius(radiusMeters)}</AppText>
                </Pressable>
              ))}
            </View>

            {error ? (
              <View style={styles.horizontalSection}>
                <InlineMessage variant="error" title="Recherche impossible" message={error} />
              </View>
            ) : null}

            {loading ? <LoadingResults /> : !searched && nearbyCandidates.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}><Icon name="search" size={24} color={colors.tealStrong} /></View>
                <AppText variant="label" align="center">Que cherchez-vous ?</AppText>
                <AppText variant="bodySmall" color="muted" align="center">Choisissez une catégorie ou tapez une envie : les lieux proches de votre Étape s’affichent ici.</AppText>
              </View>
            ) : (
              <>
                {assistantAvailable && drafts.length > 0 ? (
                  <Section title="Suggestions de l’IA">
                    <View style={styles.suggestionList}>
                      {drafts.map((draft) => (
                        <SuggestionCard key={draft.id} draft={draft} onPlan={onOpenPlace ? () => onOpenPlace(draft.candidateId) : undefined} />
                      ))}
                    </View>
                  </Section>
                ) : null}

                <View style={styles.resultsHeader}>
                  <AppText variant="h3">{nearbyCandidates.length > 0 ? `${nearbyCandidates.length} lieu${nearbyCandidates.length > 1 ? "x" : ""}` : "Aucun lieu trouvé"}</AppText>
                  {mappablePlaces.length > 0 ? (
                    <View style={styles.viewToggle} accessibilityRole="tablist">
                      <ViewToggleButton label="Liste" active={resultsView === "list"} onPress={() => setResultsView("list")} />
                      <ViewToggleButton label="Carte" active={resultsView === "map"} onPress={() => setResultsView("map")} />
                    </View>
                  ) : null}
                </View>

                {nearbyCandidates.length === 0 ? (
                  <AppText variant="bodySmall" color="muted" style={styles.horizontalSection}>Essayez une autre catégorie ou élargissez le rayon.</AppText>
                ) : resultsView === "map" && mappablePlaces.length > 0 ? (
                  <View style={styles.mapPreview}>
                    <ExpoMapsView model={{ points: mappablePlaces.map((place) => ({ id: place.id, label: place.name, coordinates: place.coordinates })) }} style={styles.mapSurface} />
                  </View>
                ) : (
                  <View style={styles.resultsList}>
                    {nearbyCandidates.map((place) => (
                      <ResultCard key={`place-${place.id}`} place={place} onPress={onOpenPlace ? () => onOpenPlace(place.id) : undefined} />
                    ))}
                  </View>
                )}

                {attributions.length > 0 ? (
                  <AppText variant="caption" color="muted" style={styles.attribution}>{`Données ${attributions.join(" · ")}. Rien n’est ajouté à l’itinéraire sans votre accord.`}</AppText>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SegmentButton({ label, icon, active, onPress }: { label: string; icon: "search" | "sparkles"; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Icon name={icon} size={16} color={active ? colors.fg : colors.muted} />
      <AppText variant="label" color={active ? "fg" : "muted"}>{label}</AppText>
    </Pressable>
  );
}

function ViewToggleButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.viewToggleButton, active && styles.viewToggleButtonActive]}>
      <AppText variant="caption" color={active ? "fg" : "muted"}>{label}</AppText>
    </Pressable>
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
    <Pressable accessibilityRole="button" onPress={onPlan} disabled={!onPlan} style={({ pressed }) => [styles.suggestionCard, pressed && styles.pressed]}>
      <View style={styles.aiSpark}>
        <Icon name="sparkles" size={16} color={colors.tealStrong} />
      </View>
      <View style={styles.suggestionBody}>
        <AppText variant="label">{draft.title}</AppText>
        <AppText variant="caption" color="muted" numberOfLines={3}>{draft.reason}</AppText>
      </View>
      {onPlan ? <Icon name="arrow-right" size={16} color={colors.muted} /> : null}
    </Pressable>
  );
}

function ResultCard({ place, onPress }: { place: PlaceCandidate; onPress?: () => void }) {
  const meta = [place.distanceMeters != null ? formatDistance(place.distanceMeters) : null, place.address].filter(Boolean).join(" · ");
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.resultCard, pressed && styles.pressed]}>
      <Image source={placeImageSource(place)} style={styles.resultImage} resizeMode="cover" />
      <View style={styles.resultBody}>
        <AppText variant="label" numberOfLines={1}>{place.name}</AppText>
        {meta ? <AppText variant="caption" color="muted" numberOfLines={2}>{meta}</AppText> : null}
        {place.imageCredit ? (
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => void Linking.openURL(place.imageCredit?.photographerUrl ?? place.imageCredit?.sourceUrl ?? "")}
          >
            <AppText variant="caption" color="muted" numberOfLines={1} style={styles.credit}>
              Photo {place.imageCredit.photographer} · Unsplash
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {onPress ? <Icon name="arrow-right" size={16} color={colors.muted} /> : null}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingBottom: spacing["2xl"] * 3 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  stopLine: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  segmented: { flexDirection: "row", marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.xs, borderRadius: radius.md, backgroundColor: colors.border },
  segment: { flex: 1, minHeight: layout.minimumTouchTarget - spacing.xs, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.surface, ...shadows.sm },
  dayHero: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.tealStrong },
  dayHeroIcon: { width: 44, height: 44, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  dayHeroText: { flex: 1, gap: spacing.xs },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  searchInput: { flex: 1 },
  searchButton: { width: 52, height: 52, borderRadius: radius.full, backgroundColor: colors.accentStrong, borderWidth: 0 },
  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  radiusRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  radiusOption: { minHeight: 36, minWidth: 52, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.full },
  radiusOptionActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  horizontalSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  emptyState: { alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.xl },
  emptyIcon: { width: 52, height: 52, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealSoft, marginBottom: spacing.xs },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { marginBottom: spacing.sm },
  suggestionList: { gap: spacing.sm },
  suggestionCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tealSoft },
  aiSpark: { width: 32, height: 32, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  suggestionBody: { flex: 1, gap: spacing.xs },
  resultsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  viewToggle: { flexDirection: "row", padding: 2, borderRadius: radius.full, backgroundColor: colors.border },
  viewToggleButton: { minHeight: 32, paddingHorizontal: spacing.md, alignItems: "center", justifyContent: "center", borderRadius: radius.full },
  viewToggleButtonActive: { backgroundColor: colors.surface },
  resultsList: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  resultCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  resultImage: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.border },
  resultBody: { flex: 1, gap: 2 },
  credit: { fontSize: 11 },
  mapPreview: { height: 360, marginHorizontal: spacing.lg, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.tealSoft },
  mapSurface: { flex: 1 },
  attribution: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  loadingContainer: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  skeletonCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface },
  skeletonLines: { flex: 1, gap: spacing.sm },
  pressed: { opacity: 0.8 },
});

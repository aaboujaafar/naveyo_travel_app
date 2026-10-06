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
import { formatPlaceCategory } from "./place-detail-model";
import type { RankedWish } from "../modules/wishlist";
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
  BottomSheet,
  Button,
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
  requestedMode?: "places" | "day" | "wishes";
  /** Shared wish list, ranked by votes; undefined hides the « Envies » tab. */
  wishes?: RankedWish[] | null;
  wishesError?: string | null;
  onOpenWishes?: () => void;
  onVoteWish?: (wishId: RankedWish["id"], vote: 1 | -1 | 0) => Promise<void>;
  onOpenWish?: (wish: RankedWish) => void;
  /** False once the Voyage is over: the « Journée IA » tab is hidden. */
  canComposeDay?: boolean;
  /** Opens the place behind a Google Maps or Apple Plans link; resolves to an error message, or null. */
  onImportLink?: (link: string) => Promise<string | null>;
}

const categories: AssistantCategory[] = [
  "Restaurants",
  "À voir",
  "Hébergements",
  "Activités",
];

type ExploreMode = "places" | "day" | "wishes";
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
  wishes,
  wishesError,
  onOpenWishes,
  onVoteWish,
  onOpenWish,
  onImportLink,
  canComposeDay = true,
}: TripAssistantScreenProps) {
  const [linkVisible, setLinkVisible] = useState(false);
  const [link, setLink] = useState("");
  const [importing, setImporting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const importLink = async () => {
    if (!onImportLink || !link.trim()) return;
    setImporting(true);
    setLinkError(null);
    try {
      const failure = await onImportLink(link.trim());
      if (failure) setLinkError(failure);
      else {
        setLink("");
        setLinkVisible(false);
      }
    } finally {
      setImporting(false);
    }
  };
  const insets = useSafeAreaInsets();
  const [chosenMode, setMode] = useState<ExploreMode>(requestedMode ?? "day");
  const mode: ExploreMode = chosenMode === "day" && !canComposeDay ? "places" : chosenMode;
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

  // The default category is already selected, so opening Lieux shows its results at once.
  const openMode = (next: ExploreMode) => {
    setMode(next);
    if (next === "places" && !searched) void discover();
    if (next === "wishes") onOpenWishes?.();
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
          {canComposeDay ? <SegmentButton label="Journée IA" icon="sparkles" active={mode === "day"} onPress={() => openMode("day")} /> : null}
          <SegmentButton label="Lieux" icon="search" active={mode === "places"} onPress={() => openMode("places")} />
          {wishes !== undefined ? <SegmentButton label="Envies" icon="users" active={mode === "wishes"} onPress={() => openMode("wishes")} /> : null}
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
        ) : mode === "wishes" ? (
          <WishesPanel wishes={wishes ?? null} error={wishesError ?? null} onVote={onVoteWish} onOpen={onOpenWish} />
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

            {onImportLink ? (
              <Pressable accessibilityRole="button" onPress={() => { setLinkError(null); setLinkVisible(true); }} style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
                <Icon name="copy" size={16} color={colors.tealStrong} />
                <AppText variant="caption" color="teal">Importer un lien Google Maps ou Plans</AppText>
              </Pressable>
            ) : null}

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
                <AppText variant="bodySmall" color="muted" align="center">Touchez une catégorie ou tapez une envie : les lieux proches de votre Étape s’affichent ici.</AppText>
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

      <BottomSheet visible={linkVisible} onClose={() => setLinkVisible(false)} title="Importer un lien">
        <AppText variant="bodySmall" color="muted">Collez le lien d’un lieu partagé depuis Google Maps ou Plans : Naveyo le retrouve et ouvre sa fiche.</AppText>
        <Input value={link} onChangeText={setLink} placeholder="https://maps.app.goo.gl/…" autoCapitalize="none" autoCorrect={false} keyboardType="url" returnKeyType="go" onSubmitEditing={() => void importLink()} />
        {linkError ? <InlineMessage variant="error" title="Import impossible" message={linkError} /> : null}
        <Button fullWidth loading={importing} disabled={!link.trim()} onPress={() => void importLink()}>Retrouver le lieu</Button>
      </BottomSheet>
    </View>
  );
}

function WishesPanel({ wishes, error, onVote, onOpen }: {
  wishes: RankedWish[] | null;
  error: string | null;
  onVote?: (wishId: RankedWish["id"], vote: 1 | -1 | 0) => Promise<void>;
  onOpen?: (wish: RankedWish) => void;
}) {
  if (error) return <View style={styles.horizontalSection}><InlineMessage title="Envies indisponibles" message={error} /></View>;
  if (wishes === null) return <LoadingResults />;
  if (wishes.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}><AppText variant="h3">♡</AppText></View>
        <AppText variant="label" align="center">Aucune envie pour l’instant</AppText>
        <AppText variant="bodySmall" color="muted" align="center">Touchez ♡ sur la fiche d’un lieu : les autres Membres votent ici, et les favoris remontent en tête.</AppText>
      </View>
    );
  }
  return (
    <View style={styles.resultsList}>
      {wishes.map((wish) => (
        <View key={wish.id} style={styles.resultCard}>
          <Pressable accessibilityRole="button" onPress={onOpen ? () => onOpen(wish) : undefined} style={styles.resultBody}>
            <AppText variant="label" numberOfLines={1}>{wish.place.name}</AppText>
            <AppText variant="caption" color="muted" numberOfLines={1}>
              {[formatPlaceCategory(wish.place.category), wish.score > 0 ? `${wish.likes} pour` : null, wish.dislikes > 0 ? `${wish.dislikes} contre` : null].filter(Boolean).join(" · ") || "Pas encore de vote"}
            </AppText>
          </Pressable>
          {onVote ? (
            <View style={styles.voteRow}>
              <VoteChip label="👍" active={wish.myVote === 1} onPress={() => void onVote(wish.id, wish.myVote === 1 ? 0 : 1)} />
              <VoteChip label="👎" active={wish.myVote === -1} onPress={() => void onVote(wish.id, wish.myVote === -1 ? 0 : -1)} />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function VoteChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={label === "👍" ? "Pour" : "Contre"} onPress={onPress} style={({ pressed }) => [styles.voteChip, active && styles.voteChipActive, pressed && styles.pressed]}>
      <AppText variant="label">{label}</AppText>
    </Pressable>
  );
}

function SegmentButton({ label, icon, active, onPress }: { label: string; icon: "search" | "sparkles" | "users"; active: boolean; onPress: () => void }) {
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
  const meta = [formatPlaceCategory(place.category), place.distanceMeters != null ? formatDistance(place.distanceMeters) : null, place.address].filter(Boolean).join(" · ");
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.resultCard, pressed && styles.pressed]}>
      {place.imageUrl ? (
        <Image source={{ uri: place.imageUrl }} style={styles.resultImage} resizeMode="cover" />
      ) : (
        <View style={[styles.resultImage, styles.resultPlaceholder, { backgroundColor: placeVisual(place).background }]}>
          <AppText variant="h3">{placeVisual(place).emoji}</AppText>
        </View>
      )}
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
/** Without a real photo, a category pictogram beats repeating one stock photo on every row. */
function placeVisual(place: PlaceCandidate): { emoji: string; background: string } {
  const category = place.category?.toLowerCase() ?? "";
  if (/cafe|coffee/.test(category)) return { emoji: "☕️", background: colors.goldSoft };
  if (/bar|pub|biergarten/.test(category)) return { emoji: "🍷", background: colors.accentSoft };
  if (/ice_cream|dessert|pastry|bakery/.test(category)) return { emoji: "🍦", background: colors.goldSoft };
  if (/catering|restaurant|food/.test(category)) return { emoji: "🍽️", background: colors.accentSoft };
  if (/accommodation|hotel|hostel/.test(category)) return { emoji: "🛏️", background: colors.tealSoft };
  if (/museum|culture|heritage/.test(category)) return { emoji: "🏛️", background: colors.tealSoft };
  if (/park|natural|leisure|beach/.test(category)) return { emoji: "🌳", background: colors.tealSoft };
  if (/religion/.test(category)) return { emoji: "⛪️", background: colors.goldSoft };
  if (/activity|sport|entertainment/.test(category)) return { emoji: "🎟️", background: colors.accentSoft };
  return { emoji: "📍", background: colors.tealSoft };
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
  resultPlaceholder: { alignItems: "center", justifyContent: "center" },
  voteRow: { flexDirection: "row", gap: spacing.xs },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "flex-start", marginHorizontal: spacing.lg, marginBottom: spacing.sm, paddingVertical: spacing.xs },
  voteChip: { width: 40, height: 40, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  voteChipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
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

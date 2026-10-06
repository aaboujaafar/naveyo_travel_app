import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MapAdapter } from "../adapters/map/interface";
import { ExpoMapsAdapter } from "../adapters/map/expo-maps-adapter";
import { ExpoMapsView } from "../adapters/map/expo-maps-view";
import type {
  Coordinates,
  ItineraryItem,
  OpeningHours,
  Stop,
  TrackPoint,
} from "../modules/_shared/model";
import { buildItineraryDays } from "../modules/itinerary";
import { describeOpeningDay, openingIntervals, openingStatusOn, weekday } from "../modules/places/opening-hours";
import type { OfflineTripPackLoad } from "../modules/offline-trip-pack";
import { colors, layout, radius, shadows, spacing, zIndex } from "../theme";
import {
  AppText,
  Badge,
  BottomSheet,
  Button,
  Chip,
  Icon,
  IconButton,
  InlineMessage,
  Skeleton,
} from "../ui";
import {
  buildItineraryMapModel,
  formatDistance,
  formatLocalItineraryDate,
  itineraryRouteCoordinates,
  trackDistanceMeters,
} from "./trip-map-model";

export interface TripItineraryScreenProps {
  stops: Stop[];
  items: ItineraryItem[];
  trackPoints: TrackPoint[];
  /** Provider facts of each planned place, keyed by place id: label and opening hours. */
  placeDetails?: Record<string, PlaceDetails>;
  offline: OfflineTripPackLoad | null;
  onDownloadOffline?: () => Promise<void>;
  /** Writes the programme and reservations into an iPhone calendar; resolves to the number of events. */
  onExportCalendar?: () => Promise<{ count: number; calendarName: string }>;
  /** Opens Apple Plans on the destination, where its map can be saved offline. */
  onOpenAppleMaps?: () => void;
  /** Present when the itinerary can be edited (online, with an editor role). */
  onMoveItem?: (item: ItineraryItem, target: { stopId: Stop["id"]; date: string }) => Promise<void>;
  onRemoveItem?: (item: ItineraryItem) => Promise<void>;
  loading: boolean;
  error?: string | null;
  /** Absent when the screen is a tab: the tab bar is the way out. */
  onBack?: () => void;
  onOpenAssistant: (stopId: Stop["id"]) => void;
  /** False once the Voyage is over: there is no day left to compose. */
  canComposeDay?: boolean;
  onOpenTracking: () => void;
  onCalculateRoute?: (coordinates: Coordinates[]) => Promise<Coordinates[] | null>;
  mapAdapter?: MapAdapter;
}

export interface PlaceDetails {
  category?: string;
  openingHours?: OpeningHours;
}

type MapFilter = "Tous" | "Restos" | "Visites" | "Hôtels" | "Transport";

const filters: MapFilter[] = ["Tous", "Restos", "Visites", "Hôtels", "Transport"];

export function TripItineraryScreen({
  stops,
  items,
  trackPoints,
  offline,
  placeDetails,
  onDownloadOffline,
  onExportCalendar,
  onOpenAppleMaps,
  onMoveItem,
  onRemoveItem,
  loading,
  error,
  onBack,
  onOpenAssistant,
  canComposeDay = true,
  onOpenTracking,
  onCalculateRoute,
  mapAdapter,
}: TripItineraryScreenProps) {
  const insets = useSafeAreaInsets();
  const days = useMemo(() => buildItineraryDays(items, stops), [items, stops]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<MapFilter>("Tous");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [movingItem, setMovingItem] = useState<ItineraryItem | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const runEdit = async (edit: () => Promise<void>) => {
    setEditError(null);
    try {
      await edit();
      setMovingItem(null);
    } catch (cause) {
      setEditError(cause instanceof Error ? cause.message : "Modification impossible. Réessayez avec une connexion.");
    }
  };
  const confirmRemove = (item: ItineraryItem) => {
    if (!onRemoveItem) return;
    Alert.alert("Retirer cette activité ?", `${item.title} sera retiré du programme pour tous les Membres du Voyage.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Retirer", style: "destructive", onPress: () => void runEdit(() => onRemoveItem(item)) },
    ]);
  };
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const activeDay =
    days.find((day) => day.date === selectedDate) ?? days[0] ?? null;
  const visibleItems = useMemo(
    () =>
      activeDay
        ? activeDay.items.filter((item) => matchesFilter(item, selectedFilter, placeDetails))
        : [],
    [activeDay, placeDetails, selectedFilter],
  );
  const routeInput = useMemo(
    () => itineraryRouteCoordinates(activeDay?.items ?? [], activeDay?.stop),
    [activeDay],
  );
  const routeKey = routeInput
    .map((coordinate) => `${coordinate.latitude},${coordinate.longitude}`)
    .join("|");
  const [routeState, setRouteState] = useState<{
    key: string;
    geometry: Coordinates[];
  }>({ key: "", geometry: [] });

  useEffect(() => {
    let active = true;
    if (!onCalculateRoute || routeInput.length < 2) return () => {
      active = false;
    };
    void onCalculateRoute(routeInput)
      .then((geometry) => {
        if (active) setRouteState({ key: routeKey, geometry: geometry ?? [] });
      })
      .catch(() => {
        if (active) setRouteState({ key: routeKey, geometry: [] });
      });
    return () => {
      active = false;
    };
  }, [onCalculateRoute, routeInput, routeKey]);

  const routePolyline = useMemo(
    () => (routeState.key === routeKey ? routeState.geometry : []),
    [routeKey, routeState.geometry, routeState.key],
  );

  const mapModel = useMemo(
    () => buildItineraryMapModel(
      visibleItems,
      trackPoints,
      activeDay ? [activeDay.stop] : stops,
      routePolyline,
    ),
    [activeDay, routePolyline, stops, trackPoints, visibleItems],
  );
  const resolvedMapAdapter = useMemo(
    () => mapAdapter ?? new ExpoMapsAdapter(),
    [mapAdapter],
  );
  const visibleSelectedPointId = mapModel.points.some(
    (point) => point.id === selectedPointId,
  )
    ? selectedPointId ?? undefined
    : undefined;
  const distance = trackDistanceMeters(trackPoints);
  const headerInsetStyle = useMemo(
    () => ({ paddingTop: Math.max(insets.top, spacing.md) }),
    [insets.top],
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, headerInsetStyle]}>
          {onBack ? <IconButton
            icon={<Icon name="arrow-left" size={20} />}
            onPress={onBack}
            accessibilityLabel="Retour au Voyage"
          /> : null}
          <AppText variant={onBack ? "h3" : "h1"} style={styles.headerTitle}>
            {onBack ? "Carte & Itinéraire" : "Carte"}
          </AppText>
          <IconButton
            icon={<Icon name="map-pin" size={20} color={colors.accent} />}
            onPress={onOpenTracking}
            accessibilityLabel="Ouvrir la Trace de trajet"
          />
        </View>

        {loading ? (
          <View style={styles.loadingDays}>
            <Skeleton width="24%" height={layout.minimumTouchTarget} borderRadius={radius.full} />
            <Skeleton width="24%" height={layout.minimumTouchTarget} borderRadius={radius.full} />
            <Skeleton width="24%" height={layout.minimumTouchTarget} borderRadius={radius.full} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayPills}
            accessibilityRole="tablist"
          >
            {days.map((day, index) => (
              <Pressable
                key={`${day.stop.id}-${day.date}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: day.date === activeDay?.date }}
                onPress={() => setSelectedDate(day.date)}
                style={({ pressed }) => [
                  styles.dayPill,
                  day.date === activeDay?.date && styles.dayPillActive,
                  pressed && styles.pressed,
                ]}
              >
                <AppText
                  variant="caption"
                  color={day.date === activeDay?.date ? "accent" : "muted"}
                >
                  Jour {index + 1}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {error ? (
          <View style={styles.horizontalSection}>
            <InlineMessage
              variant="error"
              title="Itinéraire indisponible"
              message={error}
            />
          </View>
        ) : null}

        <View style={styles.mapContainer}>
          <ExpoMapsView
            adapter={resolvedMapAdapter}
            model={mapModel}
            onPointSelected={(point) => {
              setSelectedPointId(point.id);
              setExpandedItemId(point.id);
            }}
            selectedPointId={visibleSelectedPointId}
            style={styles.mapView}
            testID="itinerary-map"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mapFilters}
          >
            {filters.map((filter) => (
              <Chip
                key={filter}
                label={filter}
                active={filter === selectedFilter}
                onPress={() => setSelectedFilter(filter)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.itinerarySection}>
          <View style={styles.itineraryHeader}>
            <View style={styles.itineraryHeaderText}>
              <AppText variant="h3">Itinéraire du jour</AppText>
              {activeDay ? (
                <AppText variant="caption" color="muted">
                  {formatLocalItineraryDate(activeDay.date)} · {activeDay.stop.name}
                </AppText>
              ) : null}
            </View>
            <Badge label={`${visibleItems.length} prévu${visibleItems.length > 1 ? "s" : ""}`} variant="teal" />
          </View>

          {editError && movingItem === null ? (
            <InlineMessage variant="error" title="Modification impossible" message={editError} />
          ) : null}
          {activeDay && visibleItems.length > 0 ? (
            <View style={styles.timeline}>
              <View style={styles.timelineLine} />
              {visibleItems.map((item) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  details={item.place?.placeId ? placeDetails?.[item.place.placeId] : undefined}
                  onMove={onMoveItem ? () => setMovingItem(item) : undefined}
                  onRemove={onRemoveItem ? () => confirmRemove(item) : undefined}
                  expanded={expandedItemId === item.id}
                  onPress={() => {
                    setSelectedPointId(
                      mapModel.points.some((point) => point.id === item.id)
                        ? item.id
                        : null,
                    );
                    setExpandedItemId((current) =>
                      current === item.id ? null : item.id,
                    );
                  }}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyDay}>
              <Icon name="calendar" size={24} color={colors.muted} />
              <AppText variant="label">Aucun élément prévu</AppText>
              <AppText variant="caption" color="muted" align="center">
                {canComposeDay ? "Laissez l’IA composer cette journée, ou ajoutez un lieu depuis Explorer." : "Rien n’a été prévu ce jour-là."}
              </AppText>
              {activeDay && canComposeDay ? (
                <Button
                  onPress={() => onOpenAssistant(activeDay.stop.id)}
                  icon={<Icon name="sparkles" size={16} color={colors.white} />}
                >
                  Composer la journée
                </Button>
              ) : null}
            </View>
          )}

          <ComingSoonFrame label="Ajouter un arrêt entre deux éléments">
            <View style={styles.addStopPreview}>
              <Icon name="plus" size={16} color={colors.accent} />
              <AppText variant="caption" color="accent">Ajouter un arrêt</AppText>
            </View>
          </ComingSoonFrame>
        </View>

        <OfflineCard offline={offline} onDownload={onDownloadOffline} onOpenAppleMaps={onOpenAppleMaps} />
        {onExportCalendar ? <CalendarCard onExport={onExportCalendar} /> : null}

        <ComingSoonSection title="Famille en temps réel">
          <View style={styles.familyRow}>
            <View style={[styles.familyDot, styles.familyDotTeal]} />
            <AppText variant="bodySmall" style={styles.familyText}>Position des Membres du Voyage</AppText>
            <AppText variant="caption" color="muted">À venir</AppText>
          </View>
          <View style={styles.shareRow}>
            <AppText variant="label">Partager ma position</AppText>
            <Badge label="Désactivé" variant="gold" />
          </View>
        </ComingSoonSection>

        <View style={styles.trackingCard}>
          <View style={styles.trackingIcon}>
            <Icon name="map-pin" size={20} color={colors.accent} />
          </View>
          <View style={styles.trackingInfo}>
            <AppText variant="label">Trace de trajet</AppText>
            <AppText variant="caption" color="muted">
              {trackPoints.length === 0
                ? "Aucun point enregistré sur cet iPhone"
                : `${trackPoints.length} point${trackPoints.length > 1 ? "s" : ""} enregistré${trackPoints.length > 1 ? "s" : ""} sur cet iPhone`}
            </AppText>
          </View>
          <Button size="sm" onPress={onOpenTracking}>Ouvrir</Button>
        </View>

        <View style={styles.statsBar}>
          <Stat value={formatDistance(distance)} label="Distance tracée" />
          <Stat value={`${trackPoints.length}`} label="Points GPS" />
          <Stat value={`${items.length}`} label="Lieux prévus" />
        </View>
      </ScrollView>

      <BottomSheet visible={movingItem !== null} onClose={() => setMovingItem(null)} title="Changer de jour" maxHeight={640}>
        {movingItem ? <AppText variant="bodySmall" color="muted">{`${movingItem.title} garde son heure et rejoint le jour choisi.`}</AppText> : null}
        {editError ? <InlineMessage variant="error" title="Modification impossible" message={editError} /> : null}
        <View style={styles.dayChoices}>
          {days.map((day, index) => {
            const current = movingItem?.date === day.date && movingItem.stopId === day.stop.id;
            return (
              <Button
                key={`${day.stop.id}-${day.date}`}
                variant={current ? "primary" : "secondary"}
                disabled={current}
                onPress={() => {
                  const item = movingItem;
                  if (item && onMoveItem) void runEdit(() => onMoveItem(item, { stopId: day.stop.id, date: day.date }));
                }}
              >
                {`Jour ${index + 1} · ${formatLocalItineraryDate(day.date)} · ${day.stop.name}`}
              </Button>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

function TimelineItem({
  details,
  onMove,
  onRemove,
  item,
  expanded,
  onPress,
}: {
  details?: PlaceDetails;
  onMove?: () => void;
  onRemove?: () => void;
  item: ItineraryItem;
  expanded: boolean;
  onPress: () => void;
}) {
  const category = itineraryCategory(item, details?.category);
  const opening = openingStatusOn(details?.openingHours, item.date, formatLocalTime(item.time?.local) ?? undefined);
  const dayIndex = weekday(item.date);
  const intervals = openingIntervals(details?.openingHours);
  const todayHours = intervals && dayIndex !== null ? describeOpeningDay(intervals, dayIndex) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ pressed }) => [styles.timelineItem, pressed && styles.pressed]}
    >
      <View style={styles.timelineDot} />
      <AppText variant="caption" color="muted" style={styles.timelineTime}>
        {formatLocalTime(item.time?.local) ?? "Sans heure"}
      </AppText>
      <AppText variant="label" style={styles.timelineName}>{item.title}</AppText>
      <View style={styles.timelineMeta}>
        <Badge label={category} variant={category === "Resto" ? "accent" : "teal"} />
        {opening === "closed-day" ? (
          <Badge label="Fermé ce jour-là" variant="danger" />
        ) : opening === "closed-time" ? (
          <Badge label="Fermé à cette heure" variant="danger" />
        ) : (
          <Badge label="Prévu" variant="gold" />
        )}
      </View>
      {expanded ? (
        <View style={styles.timelineDetail}>
          <AppText variant="caption" color="muted">
            {item.place?.address ?? item.place?.label ?? "Lieu non précisé"}
          </AppText>
          {item.time ? (
            <AppText variant="caption" color="muted">
              Heure locale {formatLocalTime(item.time.local) ?? item.time.local} · {item.time.timeZone}
            </AppText>
          ) : null}
          {todayHours ? (
            <AppText variant="caption" color={opening === "closed-day" || opening === "closed-time" ? "accent" : "muted"}>
              {`Horaires ce jour-là : ${todayHours}`}
            </AppText>
          ) : null}
          {item.notes ? <AppText variant="caption" color="muted">{item.notes}</AppText> : null}
          {onMove || onRemove ? (
            <View style={styles.itemActions}>
              {onMove ? <Button size="sm" variant="secondary" onPress={onMove}>Changer de jour</Button> : null}
              {onRemove ? <Button size="sm" variant="ghost" onPress={onRemove}>Retirer</Button> : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function OfflineCard({ offline, onDownload, onOpenAppleMaps }: { offline: OfflineTripPackLoad | null; onDownload?: () => Promise<void>; onOpenAppleMaps?: () => void }) {
  const ready = offline?.state === "ready";
  const [downloading, setDownloading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const download = async () => {
    if (!onDownload) return;
    setDownloading(true);
    setFailure(null);
    try {
      await onDownload();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Téléchargement impossible. Réessayez avec une connexion.");
    } finally {
      setDownloading(false);
    }
  };
  return (
    <View style={styles.offlineCard}>
      <View style={styles.offlineHeader}>
        <View style={[styles.offlineCheck, !ready && styles.offlineCheckInactive]}>
          <Icon name={ready ? "check" : "info"} size={14} color={ready ? colors.success : colors.gold} />
        </View>
        <AppText variant="label" style={styles.flexOne}>Voyage hors ligne</AppText>
        <Badge label={ready ? "Prêt" : "Non téléchargé"} variant={ready ? "success" : "gold"} />
      </View>
      <AppText variant="caption" color="muted">
        {ready && offline?.manifest
          ? `Téléchargé ${formatGeneratedAt(offline.manifest.generatedAt)}. Étapes, programme, réservations et dépenses restent consultables sans réseau.`
          : "Téléchargez le Voyage avant de partir : étapes, programme, réservations et dépenses resteront consultables sans réseau."}
      </AppText>
      <AppText variant="caption" color="muted">
        Le fond de carte peut rester vide sans connexion ; les lieux et leurs adresses restent listés.
      </AppText>
      {onOpenAppleMaps ? (
        <Pressable accessibilityRole="button" onPress={onOpenAppleMaps} style={({ pressed }) => [styles.mapsTip, pressed && styles.pressed]}>
          <Icon name="map" size={20} color={colors.tealStrong} />
          <View style={styles.flexOne}>
            <AppText variant="label" color="teal">Garder la carte dans Plans</AppText>
            <AppText variant="caption" color="muted">Dans Plans : votre photo › Cartes hors ligne › Télécharger une carte, puis cadrez la destination.</AppText>
          </View>
          <Icon name="arrow-right" size={16} color={colors.muted} />
        </Pressable>
      ) : null}
      {failure ? <InlineMessage variant="error" title="Téléchargement impossible" message={failure} /> : null}
      {onDownload ? (
        <Button
          variant={ready ? "secondary" : "primary"}
          fullWidth
          loading={downloading}
          onPress={() => void download()}
          icon={<Icon name={ready ? "refresh" : "arrow-right"} size={20} color={ready ? colors.fg : colors.white} />}
        >
          {ready ? "Mettre à jour" : "Télécharger pour le hors-ligne"}
        </Button>
      ) : null}
    </View>
  );
}

function CalendarCard({ onExport }: { onExport: () => Promise<{ count: number; calendarName: string }> }) {
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const exportNow = async () => {
    setExporting(true);
    setResult(null);
    try {
      const { count, calendarName } = await onExport();
      setResult({ ok: true, message: `${count} événement${count > 1 ? "s" : ""} dans le calendrier « ${calendarName} », avec rappels.` });
    } catch (cause) {
      setResult({ ok: false, message: cause instanceof Error ? cause.message : "Export impossible." });
    } finally {
      setExporting(false);
    }
  };
  return (
    <View style={styles.offlineCard}>
      <View style={styles.offlineHeader}>
        <Icon name="calendar" size={20} color={colors.accentStrong} />
        <AppText variant="label" style={styles.flexOne}>Calendrier de l’iPhone</AppText>
      </View>
      <AppText variant="caption" color="muted">
        Le programme et les réservations dans un calendrier dédié, avec un rappel 30 min avant chaque activité et 1 h avant un vol, un train ou un ferry.
      </AppText>
      {result ? <InlineMessage variant={result.ok ? "success" : "error"} title={result.ok ? "Calendrier à jour" : "Export impossible"} message={result.message} /> : null}
      <Button variant="secondary" fullWidth loading={exporting} onPress={() => void exportNow()} icon={<Icon name="calendar" size={20} color={colors.fg} />}>
        {result?.ok ? "Mettre à jour le Calendrier" : "Ajouter au Calendrier"}
      </Button>
    </View>
  );
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "récemment";
  return `le ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <AppText variant="h3" align="center">{value}</AppText>
      <AppText variant="caption" color="muted" align="center">{label}</AppText>
    </View>
  );
}

function formatLocalTime(value?: string): string | null {
  const match = value ? /(\d{2}):(\d{2})/.exec(value) : null;
  return match ? `${match[1]}:${match[2]}` : null;
}

function itineraryCategory(item: ItineraryItem, placeCategory?: string): "Resto" | "Transport" | "Visite" | "Hôtel" {
  // The provider category of the place is more reliable than words in the title.
  if (placeCategory) {
    if (/^catering/.test(placeCategory)) return "Resto";
    if (/^accommodation/.test(placeCategory)) return "Hôtel";
    if (/^(public_transport|airport|commercial\.port)/.test(placeCategory)) return "Transport";
  }
  const category = item.place?.kind === "origin" || item.place?.kind === "destination"
    ? "transport"
    : item.title.toLocaleLowerCase("fr");
  if (category.includes("restaurant") || category.includes("dîner") || category.includes("déjeuner")) return "Resto";
  if (category.includes("transport")) return "Transport";
  if (category.includes("hôtel") || category.includes("hotel")) return "Hôtel";
  return "Visite";
}

function matchesFilter(item: ItineraryItem, filter: MapFilter, placeDetails?: Record<string, PlaceDetails>): boolean {
  if (filter === "Tous") return true;
  const expected: Record<Exclude<MapFilter, "Tous">, ReturnType<typeof itineraryCategory>> = {
    Restos: "Resto",
    Visites: "Visite",
    Hôtels: "Hôtel",
    Transport: "Transport",
  };
  return itineraryCategory(item, item.place?.placeId ? placeDetails?.[item.place.placeId]?.category : undefined) === expected[filter];
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingBottom: spacing["2xl"] * 3 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerTitle: { flex: 1 },
  loadingDays: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  dayPills: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  dayPill: { minHeight: layout.minimumTouchTarget, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  dayPillActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  horizontalSection: { paddingHorizontal: spacing.lg, marginVertical: spacing.md },
  mapContainer: { position: "relative", minHeight: spacing["2xl"] * 7, marginHorizontal: spacing.md, borderRadius: radius.lg, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.tealSoft, ...shadows.md },
  mapView: { height: spacing["2xl"] * 7, width: "100%" },
  mapFilters: { position: "absolute", left: spacing.md, top: spacing.md, gap: spacing.xs, paddingRight: spacing.xl },
  itinerarySection: { padding: spacing.lg },
  itineraryHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.md },
  itineraryHeaderText: { flex: 1, gap: spacing.xs },
  timeline: { position: "relative" },
  timelineLine: { position: "absolute", left: spacing.sm + spacing.xs, top: spacing.lg, bottom: spacing.lg, width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  timelineItem: { position: "relative", minHeight: layout.minimumTouchTarget, paddingLeft: spacing["2xl"], paddingBottom: spacing.lg },
  timelineDot: { position: "absolute", left: spacing.xs, top: spacing.xs, width: spacing.lg - spacing.xs, height: spacing.lg - spacing.xs, borderRadius: radius.full, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.surface, zIndex: zIndex.content + 1 },
  timelineTime: { marginBottom: spacing.xs },
  timelineName: { marginBottom: spacing.xs },
  timelineMeta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  timelineDetail: { gap: spacing.xs, paddingTop: spacing.sm },
  emptyDay: { alignItems: "center", gap: spacing.sm, padding: spacing.xl, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  comingSoonFrame: { position: "relative" },
  comingSoonContent: { opacity: 0.46 },
  comingSoonBadge: { position: "absolute", top: spacing.sm, right: spacing.sm, zIndex: zIndex.sticky },
  addStopPreview: { minHeight: layout.minimumTouchTarget, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.md, marginLeft: spacing["2xl"], borderRadius: radius.full, borderWidth: 1, borderStyle: "dashed", borderColor: colors.accent, backgroundColor: colors.accentSoft },
  flexOne: { flex: 1 },
  mapsTip: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.tealSoft },
  itemActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  dayChoices: { gap: spacing.sm },
  offlineCard: { marginHorizontal: spacing.lg, marginBottom: spacing.xl, gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.sm },
  offlineHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  offlineCheck: { width: spacing.lg, height: spacing.lg, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealSoft },
  offlineCheckInactive: { backgroundColor: colors.goldSoft },
  offlineStatusRow: { minHeight: layout.minimumTouchTarget, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  familyRow: { minHeight: layout.minimumTouchTarget, flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  familyDot: { width: spacing.sm + spacing.xs, height: spacing.sm + spacing.xs, borderRadius: radius.full },
  familyDotAccent: { backgroundColor: colors.accent },
  familyDotTeal: { backgroundColor: colors.teal },
  familyText: { flex: 1 },
  shareRow: { minHeight: layout.minimumTouchTarget, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: spacing.md },
  trackingCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  trackingIcon: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, borderRadius: radius.sm, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  trackingInfo: { flex: 1, gap: spacing.xs },
  statsBar: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  statItem: { flex: 1, minHeight: spacing["2xl"] * 2, alignItems: "center", justifyContent: "center", gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  pressed: { transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.44 },
});

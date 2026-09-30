import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MapAdapter } from "../adapters/map/interface";
import { ExpoMapsAdapter } from "../adapters/map/expo-maps-adapter";
import { ExpoMapsView } from "../adapters/map/expo-maps-view";
import type {
  Coordinates,
  ItineraryItem,
  Stop,
  TrackPoint,
} from "../modules/_shared/model";
import { buildItineraryDays } from "../modules/itinerary";
import type { OfflineTripPackLoad } from "../modules/offline-trip-pack";
import { colors, layout, radius, shadows, spacing, zIndex } from "../theme";
import {
  AppText,
  Badge,
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
  offline: OfflineTripPackLoad | null;
  loading: boolean;
  error?: string | null;
  /** Absent when the screen is a tab: the tab bar is the way out. */
  onBack?: () => void;
  onOpenAssistant: (stopId: Stop["id"]) => void;
  onOpenTracking: () => void;
  onCalculateRoute?: (coordinates: Coordinates[]) => Promise<Coordinates[] | null>;
  mapAdapter?: MapAdapter;
}

type MapFilter = "Tous" | "Restos" | "Visites" | "Hôtels" | "Transport";

const filters: MapFilter[] = ["Tous", "Restos", "Visites", "Hôtels", "Transport"];

export function TripItineraryScreen({
  stops,
  items,
  trackPoints,
  offline,
  loading,
  error,
  onBack,
  onOpenAssistant,
  onOpenTracking,
  onCalculateRoute,
  mapAdapter,
}: TripItineraryScreenProps) {
  const insets = useSafeAreaInsets();
  const days = useMemo(() => buildItineraryDays(items, stops), [items, stops]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<MapFilter>("Tous");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const activeDay =
    days.find((day) => day.date === selectedDate) ?? days[0] ?? null;
  const visibleItems = useMemo(
    () =>
      activeDay
        ? activeDay.items.filter((item) => matchesFilter(item, selectedFilter))
        : [],
    [activeDay, selectedFilter],
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

          {activeDay && visibleItems.length > 0 ? (
            <View style={styles.timeline}>
              <View style={styles.timelineLine} />
              {visibleItems.map((item) => (
                <TimelineItem
                  key={item.id}
                  item={item}
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
                Laissez l’IA composer cette journée, ou ajoutez un lieu depuis Explorer.
              </AppText>
              {activeDay ? (
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

        <OfflineCard offline={offline} />

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
              {trackPoints.length} point{trackPoints.length > 1 ? "s" : ""} enregistré{trackPoints.length > 1 ? "s" : ""} par cet appareil
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

    </View>
  );
}

function TimelineItem({
  item,
  expanded,
  onPress,
}: {
  item: ItineraryItem;
  expanded: boolean;
  onPress: () => void;
}) {
  const category = itineraryCategory(item);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ pressed }) => [styles.timelineItem, pressed && styles.pressed]}
    >
      <View style={styles.timelineDot} />
      <AppText variant="caption" color="muted" style={styles.timelineTime}>
        {item.time?.local ?? "Sans heure"}
      </AppText>
      <AppText variant="label" style={styles.timelineName}>{item.title}</AppText>
      <View style={styles.timelineMeta}>
        <Badge label={category} variant={category === "Resto" ? "accent" : "teal"} />
        <Badge label="Prévu" variant="gold" />
      </View>
      {expanded ? (
        <View style={styles.timelineDetail}>
          <AppText variant="caption" color="muted">
            {item.place?.address ?? item.place?.label ?? "Lieu non précisé"}
          </AppText>
          {item.time ? (
            <AppText variant="caption" color="muted">
              Heure locale {item.time.local} · {item.time.timeZone}
            </AppText>
          ) : null}
          {item.notes ? <AppText variant="caption" color="muted">{item.notes}</AppText> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function OfflineCard({ offline }: { offline: OfflineTripPackLoad | null }) {
  const ready = offline?.state === "ready";
  return (
    <View style={styles.offlineCard}>
      <View style={styles.offlineHeader}>
        <View style={[styles.offlineCheck, !ready && styles.offlineCheckInactive]}>
          <Icon name={ready ? "check" : "info"} size={14} color={ready ? colors.success : colors.gold} />
        </View>
        <AppText variant="label">
          {ready ? "Paquet de voyage disponible" : "Paquet hors ligne indisponible"}
        </AppText>
      </View>
      <AppText variant="caption" color="muted">
        {ready && offline?.manifest
          ? `Généré le ${offline.manifest.generatedAt} · révision ${offline.manifest.serverRevision}`
          : offline?.reason ?? "Téléchargez le Voyage avant de partir."}
      </AppText>
      <View style={styles.offlineStatusRow}>
        <AppText variant="label">Consultation hors ligne</AppText>
        <Badge label={ready ? "Prête" : "Non prête"} variant={ready ? "success" : "gold"} />
      </View>
      <AppText variant="caption" color="muted">
        Le fond MapKit n’est jamais garanti hors connexion ; les lieux, coordonnées et traces restent listés.
      </AppText>
    </View>
  );
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

function itineraryCategory(item: ItineraryItem): "Resto" | "Transport" | "Visite" | "Hôtel" {
  const category = item.place?.kind === "origin" || item.place?.kind === "destination"
    ? "transport"
    : item.title.toLocaleLowerCase("fr");
  if (category.includes("restaurant") || category.includes("dîner") || category.includes("déjeuner")) return "Resto";
  if (category.includes("transport")) return "Transport";
  if (category.includes("hôtel") || category.includes("hotel")) return "Hôtel";
  return "Visite";
}

function matchesFilter(item: ItineraryItem, filter: MapFilter): boolean {
  if (filter === "Tous") return true;
  const expected: Record<Exclude<MapFilter, "Tous">, ReturnType<typeof itineraryCategory>> = {
    Restos: "Resto",
    Visites: "Visite",
    Hôtels: "Hôtel",
    Transport: "Transport",
  };
  return itineraryCategory(item) === expected[filter];
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

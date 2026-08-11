import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
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
  formatDistance,
  formatLocalItineraryDate,
  itineraryPointCount,
  trackDistanceMeters,
} from "./trip-map-model";

export interface TripItineraryScreenProps {
  stops: Stop[];
  items: ItineraryItem[];
  trackPoints: TrackPoint[];
  offline: OfflineTripPackLoad | null;
  loading: boolean;
  error?: string | null;
  onBack: () => void;
  onOpenTrip: () => void;
  onOpenAssistant: (stopId: Stop["id"]) => void;
  onOpenTracking: () => void;
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
  onOpenTrip,
  onOpenAssistant,
  onOpenTracking,
}: TripItineraryScreenProps) {
  const insets = useSafeAreaInsets();
  const days = useMemo(() => buildItineraryDays(items, stops), [items, stops]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<MapFilter>("Tous");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const activeDay =
    days.find((day) => day.date === selectedDate) ?? days[0] ?? null;
  const visibleItems = activeDay
    ? activeDay.items.filter((item) => matchesFilter(item, selectedFilter))
    : [];
  const coordinateCount = itineraryPointCount(items);
  const distance = trackDistanceMeters(trackPoints);
  const headerInsetStyle = useMemo(
    () => ({ paddingTop: Math.max(insets.top, spacing.md) }),
    [insets.top],
  );
  const navigationInsetStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, spacing.sm) }),
    [insets.bottom],
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, headerInsetStyle]}>
          <IconButton
            icon={<Icon name="arrow-left" size={20} />}
            onPress={onBack}
            accessibilityLabel="Retour au Voyage"
          />
          <AppText variant="h3" style={styles.headerTitle}>
            Carte & Itinéraire
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
                  color={day.date === activeDay?.date ? "onAccent" : "muted"}
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
          <View style={styles.mapBackground}>
            <Icon name="map" size={32} color={colors.teal} />
            <AppText variant="label" align="center">
              {coordinateCount === 0
                ? "Aucun lieu géolocalisé"
                : "Fond cartographique indisponible"}
            </AppText>
            <AppText variant="caption" color="muted" align="center">
              {coordinateCount === 0
                ? "Les coordonnées confirmées apparaîtront ici."
                : `${coordinateCount} lieu${coordinateCount > 1 ? "x" : ""} avec coordonnées reste${coordinateCount > 1 ? "nt" : ""} disponible${coordinateCount > 1 ? "s" : ""} dans la liste.`}
            </AppText>
            <Badge label="Mode dégradé" variant="gold" />
          </View>
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
          <View style={styles.mapControls}>
            <IconButton
              icon={<Icon name="plus" size={20} />}
              onPress={() => undefined}
              disabled
              accessibilityLabel="Zoom avant, à venir"
            />
            <IconButton
              icon={<AppText variant="h3">−</AppText>}
              onPress={() => undefined}
              disabled
              accessibilityLabel="Zoom arrière, à venir"
            />
          </View>
        </View>

        <View style={styles.itinerarySection}>
          <View style={styles.itineraryHeader}>
            <View style={styles.itineraryHeaderText}>
              <AppText variant="h3">Itinéraire du jour</AppText>
              {activeDay ? (
                <AppText variant="caption" color="muted">
                  {formatLocalItineraryDate(activeDay.date)} · {activeDay.stop.name} · {activeDay.stop.timeZone}
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
                  onPress={() =>
                    setExpandedItemId((current) => current === item.id ? null : item.id)
                  }
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyDay}>
              <Icon name="calendar" size={24} color={colors.muted} />
              <AppText variant="label">Aucun élément prévu</AppText>
              <AppText variant="caption" color="muted" align="center">
                Ajoutez d’abord un lieu confirmé depuis les Suggestions IA.
              </AppText>
              {activeDay ? (
                <Button
                  variant="secondary"
                  onPress={() => onOpenAssistant(activeDay.stop.id)}
                >
                  Découvrir des lieux
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

      <View style={[styles.bottomNav, navigationInsetStyle]}>
        <BottomNavItem icon="home" label="Accueil" onPress={onOpenTrip} />
        <BottomNavItem icon="search" label="Explorer" comingSoon />
        <BottomNavItem icon="image" label="Photos" comingSoon />
        <BottomNavItem icon="file-text" label="Journal" comingSoon />
        <BottomNavItem icon="map" label="Carte" active />
      </View>
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
  return (
    <View
      accessible
      accessibilityLabel={`${label}, à venir`}
      accessibilityState={{ disabled: true }}
      style={styles.comingSoonFrame}
    >
      <View pointerEvents="none" style={styles.comingSoonContent}>{children}</View>
      <Badge label="À venir" variant="gold" style={styles.comingSoonBadge} />
    </View>
  );
}

function ComingSoonSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="sectionTitle" color="muted" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </AppText>
      <ComingSoonFrame label={title}>{children}</ComingSoonFrame>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <AppText variant="h3" align="center">{value}</AppText>
      <AppText variant="caption" color="muted" align="center">{label}</AppText>
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
  icon: "home" | "search" | "image" | "file-text" | "map";
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
  dayPillActive: { borderColor: colors.accent, backgroundColor: colors.accent, ...shadows.accent },
  horizontalSection: { paddingHorizontal: spacing.lg, marginVertical: spacing.md },
  mapContainer: { position: "relative", minHeight: spacing["2xl"] * 7, marginHorizontal: spacing.md, borderRadius: radius.lg, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.tealSoft, ...shadows.md },
  mapBackground: { flex: 1, minHeight: spacing["2xl"] * 7, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  mapFilters: { position: "absolute", left: spacing.md, top: spacing.md, gap: spacing.xs, paddingRight: spacing.xl },
  mapControls: { position: "absolute", right: spacing.md, bottom: spacing.xl, gap: spacing.sm },
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
  bottomNav: { position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: layout.maxMobileWidth, alignSelf: "center", flexDirection: "row", paddingTop: spacing.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, zIndex: zIndex.sticky, ...shadows.sm },
  bottomNavItem: { flex: 1, minHeight: spacing["2xl"], alignItems: "center", justifyContent: "center", gap: spacing.xs },
});

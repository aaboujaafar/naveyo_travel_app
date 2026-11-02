import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { Trip } from "../modules/_shared/model";
import type { OfflineTripPackLoad } from "../modules/offline-trip-pack";
import { colors, radius, shadows, spacing } from "../theme";
import { AppText, Badge, Button, EmptyState, Icon, IconButton, InlineMessage, ProgressBar, Skeleton, Screen, TopBar } from "../ui";
import { formatTripsListDateRange, localToday, orderTrips, tripMemberCount, tripTiming } from "./trips-list-model";
import { DestinationImage } from "../ui/DestinationImage";

export interface TripsListScreenProps {
  items: Trip[];
  packs: Record<string, OfflineTripPackLoad>;
  loading: boolean;
  error: string | null;
  onRetry: () => Promise<void>;
  onCreate: () => void;
  onOpenTrip: (trip: Trip) => void;
  onOpenAccount: () => void;
  onOpenImports: () => void;
  onJoinTrip: () => void;
}

export function TripsListScreen(props: TripsListScreenProps) {
  const { pinned, upcoming, past } = useMemo(() => orderTrips(props.items, localToday()), [props.items]);
  const card = (trip: Trip, isPinned = false) => <TripCard key={trip.id} trip={trip} pinned={isPinned} pack={props.packs[trip.id]} onPress={() => props.onOpenTrip(trip)} />;
  return (
    <Screen scroll contentStyle={styles.content}>
      <TopBar title="Mes Voyages" actions={<View style={styles.headerActions}><IconButton size={40} onPress={props.onOpenAccount} accessibilityLabel="Ouvrir mon compte" icon={<Icon name="user" size={20} />} /><IconButton size={40} onPress={props.onCreate} accessibilityLabel="Créer un Voyage" icon={<Icon name="plus" size={20} color={colors.white} />} style={styles.createButton} /></View>} />
      <View style={styles.intro}><AppText variant="bodySmall" color="muted">Vos espaces privés de préparation et de consultation.</AppText></View>
      <View style={styles.shortcuts}>
        <Shortcut icon="file-text" label="Importer" detail="Ajouter une confirmation" onPress={props.onOpenImports} />
        <Shortcut icon="user-plus" label="Rejoindre" detail="Utiliser une invitation" onPress={props.onJoinTrip} />
      </View>
      {props.error ? <View style={styles.message}><InlineMessage variant="error" title="Impossible de charger les Voyages" message={props.error} /><Button variant="secondary" onPress={() => void props.onRetry()}>Réessayer</Button></View> : null}
      {props.loading ? <LoadingList /> : props.items.length === 0 ? <EmptyState title="Aucun Voyage" message="Créez votre premier Voyage privé." actionLabel="Créer un Voyage" onAction={props.onCreate} /> : (
        <View style={styles.list}>
          {pinned.length > 0 ? <View style={styles.listHeading}><Icon name="map-pin" size={14} color={colors.accentStrong} /><AppText variant="label" color="accent">En ce moment</AppText></View> : null}
          {pinned.map((trip) => card(trip, true))}
          {upcoming.length > 0 && (pinned.length > 0 || past.length > 0) ? <View style={styles.listHeading}><AppText variant="label" color="muted">À venir</AppText></View> : null}
          {upcoming.map((trip) => card(trip))}
          {past.length > 0 ? <View style={styles.listHeading}><AppText variant="label" color="muted">Terminés</AppText></View> : null}
          {past.map((trip) => card(trip))}
        </View>
      )}
    </Screen>
  );
}

function Shortcut({ icon, label, detail, onPress }: { icon: "file-text" | "user-plus"; label: string; detail: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}><Icon name={icon} size={20} color={colors.teal} /><View style={styles.shortcutText}><AppText variant="label">{label}</AppText><AppText variant="caption" color="muted">{detail}</AppText></View><Icon name="arrow-right" size={16} color={colors.muted} /></Pressable>;
}

function TripCard({ trip, pack, pinned = false, onPress }: { trip: Trip; pack?: OfflineTripPackLoad; pinned?: boolean; onPress: () => void }) {
  const packReady = pack?.state === "ready";
  const memberCount = tripMemberCount(trip);
  const timing = tripTiming(trip, localToday());
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, shadows.sm, pinned && styles.cardPinned, timing.phase === "past" && styles.cardPast, pressed && styles.pressed]}>
    <DestinationImage name={trip.name} imageUrl={trip.imageUrl} style={styles.cover} />
    <View style={styles.cardHeader}><View style={styles.titleWrap}><AppText variant="h3" numberOfLines={2}>{trip.name}</AppText><AppText variant="caption" color="muted">{formatTripsListDateRange(trip)}</AppText></View><Badge label={trip.referenceCurrency} variant="teal" /></View>
    <View style={styles.meta}><View style={styles.metaItem}><Icon name="users" size={16} color={colors.muted} /><AppText variant="caption" color="muted">{memberCount} membre{memberCount > 1 ? "s" : ""}</AppText></View><View style={styles.metaItem}><Icon name="map-pin" size={16} color={colors.muted} /><AppText variant="caption" color="muted">{trip.stopIds.length} Étape{trip.stopIds.length > 1 ? "s" : ""}</AppText></View></View>
    <View style={styles.progress}>
      <View style={styles.progressLabels}>
        <AppText variant="label" color={timing.phase === "ongoing" ? "accent" : "fg"}>{timing.label}</AppText>
        {packReady ? <AppText variant="caption" color="teal">Disponible hors ligne</AppText> : null}
      </View>
      {timing.phase === "ongoing" ? <ProgressBar progress={timing.progress} color="accent" /> : null}
    </View>
  </Pressable>;
}

function LoadingList() { return <View style={styles.list}>{[1, 2].map((key) => <View key={key} style={styles.loadingCard}><Skeleton height={spacing.lg} width="55%" /><Skeleton height={spacing.sm} width="38%" /><Skeleton height={spacing.sm} /><Skeleton height={spacing.lg} /></View>)}</View>; }

const styles = StyleSheet.create({
  createButton: { backgroundColor: colors.accentStrong, borderWidth: 0 },
  content: { paddingHorizontal: 0, paddingVertical: 0, paddingBottom: spacing["2xl"] },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  intro: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  shortcuts: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  shortcut: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  shortcutText: { flex: 1, gap: spacing.xs },
  message: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  list: { gap: spacing.md, paddingHorizontal: spacing.lg },
  listHeading: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  cardPinned: { borderColor: colors.accent, borderWidth: 1.5 },
  cardPast: { opacity: 0.85 },
  card: { overflow: "hidden", paddingBottom: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, gap: spacing.md },
  cover: { width: "100%", height: spacing["2xl"] * 4, backgroundColor: colors.tealSoft },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingHorizontal: spacing.lg },
  titleWrap: { flex: 1, gap: spacing.xs },
  meta: { flexDirection: "row", gap: spacing.lg, paddingHorizontal: spacing.lg },
  metaItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  progress: { gap: spacing.xs, paddingHorizontal: spacing.lg },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm, marginHorizontal: spacing.lg },
  footerSpacer: { flex: 1 },
  pressed: { transform: [{ scale: 0.98 }] },
  loadingCard: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg },
});

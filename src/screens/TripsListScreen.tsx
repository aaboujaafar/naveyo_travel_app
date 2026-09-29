import { useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import type { Trip } from "../modules/_shared/model";
import type { OfflineTripPackLoad } from "../modules/offline-trip-pack";
import { colors, radius, shadows, spacing } from "../theme";
import { AppText, Badge, Button, EmptyState, Icon, IconButton, InlineMessage, ProgressBar, Skeleton, Screen, TopBar } from "../ui";
import { formatTripsListDateRange, tripMemberCount } from "./trips-list-model";
import { destinationImageLabel, destinationImageSource } from "../ui/destination-image";

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
  const ordered = useMemo(() => [...props.items].sort((a, b) => (a.startsOn ?? "9999").localeCompare(b.startsOn ?? "9999")), [props.items]);
  return (
    <Screen scroll contentStyle={styles.content}>
      <TopBar title="Mes Voyages" actions={<View style={styles.headerActions}><IconButton size={40} onPress={props.onOpenAccount} accessibilityLabel="Ouvrir mon compte" icon={<Icon name="user" size={20} />} /><Button size="sm" onPress={props.onCreate} icon={<Icon name="plus" size={16} color={colors.white} />}>Nouveau</Button></View>} />
      <View style={styles.intro}><AppText variant="bodySmall" color="muted">Vos espaces privés de préparation et de consultation.</AppText></View>
      <View style={styles.shortcuts}>
        <Shortcut icon="file-text" label="Importer" detail="Ajouter une confirmation" onPress={props.onOpenImports} />
        <Shortcut icon="user-plus" label="Rejoindre" detail="Utiliser une invitation" onPress={props.onJoinTrip} />
      </View>
      {props.error ? <View style={styles.message}><InlineMessage variant="error" title="Impossible de charger les Voyages" message={props.error} /><Button variant="secondary" onPress={() => void props.onRetry()}>Réessayer</Button></View> : null}
      {props.loading ? <LoadingList /> : ordered.length === 0 ? <EmptyState title="Aucun Voyage" message="Créez votre premier Voyage privé." actionLabel="Créer un Voyage" onAction={props.onCreate} /> : (
        <View style={styles.list}>{ordered.map((trip) => <TripCard key={trip.id} trip={trip} pack={props.packs[trip.id]} onPress={() => props.onOpenTrip(trip)} />)}</View>
      )}
    </Screen>
  );
}

function Shortcut({ icon, label, detail, onPress }: { icon: "file-text" | "user-plus"; label: string; detail: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}><Icon name={icon} size={20} color={colors.teal} /><View style={styles.shortcutText}><AppText variant="label">{label}</AppText><AppText variant="caption" color="muted">{detail}</AppText></View><Icon name="arrow-right" size={16} color={colors.muted} /></Pressable>;
}

function TripCard({ trip, pack, onPress }: { trip: Trip; pack?: OfflineTripPackLoad; onPress: () => void }) {
  const packReady = pack?.state === "ready";
  const memberCount = tripMemberCount(trip);
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, shadows.sm, pressed && styles.pressed]}>
    <Image source={destinationImageSource(trip.name, trip.imageUrl)} style={styles.cover} resizeMode="cover" accessibilityLabel={destinationImageLabel(trip.name, trip.imageUrl)} />
    <View style={styles.cardHeader}><View style={styles.titleWrap}><AppText variant="h3" numberOfLines={2}>{trip.name}</AppText><AppText variant="caption" color="muted">{formatTripsListDateRange(trip)}</AppText></View><Badge label={trip.referenceCurrency} variant="teal" /></View>
    <View style={styles.meta}><View style={styles.metaItem}><Icon name="users" size={16} color={colors.muted} /><AppText variant="caption" color="muted">{memberCount} membre{memberCount > 1 ? "s" : ""}</AppText></View><View style={styles.metaItem}><Icon name="map-pin" size={16} color={colors.muted} /><AppText variant="caption" color="muted">{trip.stopIds.length} Étape{trip.stopIds.length > 1 ? "s" : ""}</AppText></View></View>
    <View style={styles.progress}><View style={styles.progressLabels}><AppText variant="label">Préparation</AppText><AppText variant="caption" color="muted">{packReady ? "Paquet hors ligne prêt" : "À synchroniser"}</AppText></View><ProgressBar progress={packReady ? 1 : 0} color={packReady ? "teal" : "accent"} /></View>
    <View style={styles.cardFooter}><Icon name="users" size={20} color={colors.teal} /><AppText variant="caption" color="muted">{memberCount} Compte{memberCount > 1 ? "s" : ""} autorisé{memberCount > 1 ? "s" : ""}</AppText><View style={styles.footerSpacer} /><Icon name="arrow-right" size={20} color={colors.accent} /></View>
  </Pressable>;
}

function LoadingList() { return <View style={styles.list}>{[1, 2].map((key) => <View key={key} style={styles.loadingCard}><Skeleton height={spacing.lg} width="55%" /><Skeleton height={spacing.sm} width="38%" /><Skeleton height={spacing.sm} /><Skeleton height={spacing.lg} /></View>)}</View>; }

const styles = StyleSheet.create({
  content: { paddingHorizontal: 0, paddingVertical: 0, paddingBottom: spacing["2xl"] },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  intro: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  shortcuts: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  shortcut: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  shortcutText: { flex: 1, gap: spacing.xs },
  message: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  list: { gap: spacing.md, paddingHorizontal: spacing.lg },
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

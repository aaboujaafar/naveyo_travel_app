import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { PlaceReference, Reservation } from "../modules/_shared/model";
import { colors, layout, radius, spacing } from "../theme";
import { AppText, Badge, Button, Icon, InlineMessage, Skeleton } from "../ui";
import { RecordsHeader, RecordsTabs } from "./TripDocumentsScreen";
import { formatReservationDate, formatReservationTime, labelReservationType } from "./travel-records-model";

export interface TripReservationsScreenProps {
  tripName: string;
  items: Reservation[];
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onRetry: () => Promise<void>;
  onOpenDocuments: () => void;
  onOpenPacking: () => void;
  onImport: () => void;
  onOpenNavigation: (place: PlaceReference, provider: "apple" | "waze") => Promise<void>;
}

export function TripReservationsScreen(props: TripReservationsScreenProps) {
  const sorted = [...props.items].sort((left, right) => (left.start?.local ?? "9999").localeCompare(right.start?.local ?? "9999"));
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <RecordsHeader title="Réservations" subtitle={props.tripName} onBack={props.onBack} />
        <RecordsTabs active="reservations" onOpenDocuments={props.onOpenDocuments} onOpenReservations={() => undefined} onOpenPacking={props.onOpenPacking} />
        <View style={styles.confirmationNote}><Icon name="check" size={20} color={colors.success} /><AppText variant="bodySmall" color="muted" style={styles.flexOne}>Seules les Réservations confirmées après relecture humaine apparaissent ici.</AppText></View>
        {props.error ? <View style={styles.message}><InlineMessage variant="error" title="Chargement impossible" message={props.error} /><Button variant="secondary" onPress={() => void props.onRetry()}>Réessayer</Button></View> : null}

        <View style={styles.panel}>
          {props.loading ? <ReservationsLoading /> : sorted.length === 0 ? <View style={styles.empty}><InlineMessage title="Aucune Réservation" message="Importez une confirmation, relisez le brouillon puis confirmez chaque champ requis." /><Button onPress={props.onImport}>Importer une confirmation</Button></View> : (
            <View style={styles.timeline}>
              <View style={styles.timelineLine} />
              {sorted.map((reservation) => <ReservationTimelineItem key={reservation.id} reservation={reservation} onOpenNavigation={props.onOpenNavigation} />)}
            </View>
          )}
        </View>
        {sorted.length > 0 ? <View style={styles.importAction}><Button fullWidth onPress={props.onImport} icon={<Icon name="plus" size={20} color={colors.white} />}>Importer une confirmation</Button></View> : null}
      </ScrollView>
    </View>
  );
}

function ReservationTimelineItem({ reservation, onOpenNavigation }: { reservation: Reservation; onOpenNavigation: TripReservationsScreenProps["onOpenNavigation"] }) {
  const locations = [
    reservation.venue ? { label: "Lieu", place: reservation.venue } : null,
    reservation.origin ? { label: "Départ", place: reservation.origin } : null,
    reservation.destination ? { label: "Arrivée", place: reservation.destination } : null,
  ].filter((value): value is { label: string; place: PlaceReference } => value !== null);
  const time = formatReservationTime(reservation);
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDot} />
      <AppText variant="badge" color="accent" style={styles.timelineDate}>{formatReservationDate(reservation)}</AppText>
      <View style={styles.card}>
        <View style={styles.cardHeader}><Badge label={labelReservationType(reservation.type)} variant="teal" /><Badge label="Confirmée" variant="success" /></View>
        <AppText variant="label">{reservation.title}</AppText>
        <View style={styles.meta}>{time ? <AppText variant="caption" color="muted">{time} · {reservation.start?.timeZone}</AppText> : null}{reservation.provider ? <AppText variant="caption" color="muted">{reservation.provider}</AppText> : null}{reservation.reference ? <AppText variant="caption" color="muted">Réf. {reservation.reference}</AppText> : null}</View>
        {locations.map(({ label, place }) => (
          <View key={`${label}-${place.label}`} style={styles.location}>
            <AppText variant="caption">{label} · {place.label}</AppText>
            <View style={styles.navigation}><SmallLink label="Plans" onPress={() => void onOpenNavigation(place, "apple")} /><SmallLink label="Waze" onPress={() => void onOpenNavigation(place, "waze")} /></View>
          </View>
        ))}
        <View style={styles.status}><Icon name="check" size={14} color={colors.success} /><AppText variant="caption" color="success">Confirmée après relecture</AppText></View>
      </View>
    </View>
  );
}

function SmallLink({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.smallLink, pressed && styles.pressed]}><AppText variant="caption" color="teal">{label}</AppText></Pressable>; }
function ReservationsLoading() { return <View style={styles.loading}><Skeleton height={spacing["2xl"] * 2} /><Skeleton height={spacing["2xl"] * 2} /><Skeleton height={spacing["2xl"] * 2} /></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, scrollContent: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingBottom: spacing["2xl"] }, confirmationNote: { flexDirection: "row", gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, backgroundColor: colors.tealSoft, borderRadius: radius.sm }, message: { marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm }, panel: { paddingHorizontal: spacing.lg }, empty: { gap: spacing.md }, timeline: { position: "relative", paddingLeft: spacing.lg }, timelineLine: { position: "absolute", left: spacing.sm, top: spacing.md, bottom: spacing.md, width: spacing.xs / 2, backgroundColor: colors.border }, timelineItem: { position: "relative", paddingLeft: spacing.md, paddingVertical: spacing.md }, timelineDot: { position: "absolute", left: -spacing.lg + spacing.xs, top: spacing.lg, width: spacing.sm + spacing.xs / 2, height: spacing.sm + spacing.xs / 2, borderRadius: radius.full, backgroundColor: colors.accent, borderWidth: spacing.xs / 2, borderColor: colors.surface }, timelineDate: { textTransform: "uppercase", marginBottom: spacing.xs }, card: { padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, gap: spacing.xs }, cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }, meta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, location: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }, navigation: { flexDirection: "row", gap: spacing.sm }, smallLink: { minHeight: spacing["2xl"] - spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }, status: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs }, importAction: { padding: spacing.lg }, flexOne: { flex: 1 }, pressed: { transform: [{ scale: 0.97 }] }, loading: { gap: spacing.sm },
});

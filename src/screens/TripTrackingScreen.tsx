import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type {
  TrackPoint,
  TrackingStatus,
  UUID,
} from "../modules/_shared/model";
import {
  trackingButtonLabel,
  trackingStatusMessage,
  trackingStatusTitle,
} from "../modules/trip-tracking/tracking-screen-state";
import { colors, layout, radius, shadows, spacing } from "../theme";
import {
  AppText,
  Badge,
  Button,
  Checkbox,
  Icon,
  IconButton,
  InlineMessage,
  Screen,
} from "../ui";
import {
  formatDistance,
  isTrackingAnotherTrip,
  trackDistanceMeters,
} from "./trip-map-model";

export interface TripTrackingScreenProps {
  tripId: UUID | null;
  status: TrackingStatus;
  points: TrackPoint[];
  busy: boolean;
  onBack: () => void;
  onToggle: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function TripTrackingScreen({
  tripId,
  status,
  points,
  busy,
  onBack,
  onToggle,
  onRefresh,
}: TripTrackingScreenProps) {
  const [consentAccepted, setConsentAccepted] = useState(false);
  const recording = status.state === "recording" && status.tripId === tripId;
  const anotherTripRecording = tripId
    ? isTrackingAnotherTrip(status, tripId)
    : false;
  const distance = trackDistanceMeters(points);
  const canToggle =
    tripId !== null &&
    !busy &&
    status.state !== "starting" &&
    !anotherTripRecording &&
    (recording || consentAccepted);

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <IconButton
          icon={<Icon name="arrow-left" size={20} />}
          onPress={onBack}
          accessibilityLabel="Retour à la carte"
        />
        <View style={styles.headerText}>
          <AppText variant="h3">Trace de trajet</AppText>
          <AppText variant="caption" color="muted">
            Un seul appareil enregistreur
          </AppText>
        </View>
        <IconButton
          icon={<Icon name="refresh" size={20} />}
          onPress={() => void onRefresh()}
          disabled={busy}
          accessibilityLabel="Actualiser l’état de la Trace"
        />
      </View>

      <View style={styles.mapPanel}>
        <View style={[styles.trackingPulse, recording && styles.trackingPulseActive]}>
          <Icon
            name="map-pin"
            size={32}
            color={recording ? colors.accent : colors.muted}
          />
        </View>
        <AppText variant="h3" align="center">{trackingStatusTitle(status)}</AppText>
        <AppText variant="bodySmall" color="muted" align="center">
          {trackingStatusMessage(status)}
        </AppText>
        <Badge
          label={recording ? "Enregistrement actif" : "Trace arrêtée"}
          variant={recording ? "accent" : "gold"}
        />
      </View>

      <View style={styles.statsBar}>
        <Stat value={formatDistance(distance)} label="Distance" />
        <Stat value={`${points.length}`} label="Points GPS" />
        <Stat value={recording ? "Actif" : "Arrêté"} label="État" />
      </View>

      {status.state === "error" ? (
        <InlineMessage
          variant="error"
          title="Trace indisponible"
          message={status.message ?? "Le suivi n’a pas pu démarrer."}
        />
      ) : null}

      {anotherTripRecording ? (
        <InlineMessage
          variant="error"
          title="Un autre Voyage est enregistré"
          message="Arrêtez la Trace active sur cet appareil avant d’en démarrer une autre."
        />
      ) : null}

      <View style={styles.consentCard}>
        <View style={styles.consentHeader}>
          <View style={styles.consentIcon}>
            <Icon name="info" size={20} color={colors.teal} />
          </View>
          <View style={styles.consentText}>
            <AppText variant="label">Consentement explicite</AppText>
            <AppText variant="caption" color="muted">
              La Trace enregistre les positions WGS84 horodatées de cet appareil. Elle n’affiche jamais la position live d’un Membre du voyage.
            </AppText>
          </View>
        </View>
        {!recording ? (
          <Checkbox
            checked={consentAccepted}
            onChange={setConsentAccepted}
            label="J’accepte de démarrer la Trace sur cet appareil"
            disabled={busy || anotherTripRecording}
          />
        ) : (
          <InlineMessage
            variant="success"
            title="Consentement actif"
            message="L’arrêt reste disponible à tout moment."
          />
        )}
        <Button
          fullWidth
          loading={busy}
          disabled={!canToggle}
          onPress={() => void onToggle()}
          accessibilityLabel={trackingButtonLabel(status)}
        >
          {trackingButtonLabel(status)}
        </Button>
      </View>

      <View style={styles.privacyCard}>
        <Icon name="info" size={20} color={colors.gold} />
        <View style={styles.privacyText}>
          <AppText variant="label">Données personnelles</AppText>
          <AppText variant="caption" color="muted">
            Les coordonnées ne sont pas affichées dans cette interface et ne doivent jamais apparaître dans les logs. Les points locaux reprennent leur synchronisation au retour du réseau.
          </AppText>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel="Famille en temps réel, à venir"
        accessibilityState={{ disabled: true }}
        style={styles.comingSoonSection}
      >
        <View pointerEvents="none" style={styles.comingSoonContent}>
          <AppText variant="sectionTitle" color="muted" style={styles.sectionTitle}>
            FAMILLE EN TEMPS RÉEL
          </AppText>
          <View style={styles.familyRow}>
            <View style={styles.familyDot} />
            <AppText variant="bodySmall" style={styles.familyText}>Position des Membres du Voyage</AppText>
            <AppText variant="caption" color="muted">À venir</AppText>
          </View>
        </View>
        <Badge label="À venir" variant="gold" style={styles.comingSoonBadge} />
      </View>
    </Screen>
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

const styles = StyleSheet.create({
  content: { paddingHorizontal: 0, paddingVertical: 0, paddingBottom: spacing.xl, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  mapPanel: { minHeight: spacing["2xl"] * 5, alignItems: "center", justifyContent: "center", gap: spacing.sm, marginHorizontal: spacing.md, padding: spacing.xl, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.tealSoft, ...shadows.md },
  trackingPulse: { width: spacing["2xl"] * 2, height: spacing["2xl"] * 2, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
  trackingPulseActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft, ...shadows.accent },
  statsBar: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg },
  statItem: { flex: 1, minHeight: spacing["2xl"] * 2, alignItems: "center", justifyContent: "center", gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  consentCard: { marginHorizontal: spacing.lg, gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.sm },
  consentHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  consentIcon: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealSoft },
  consentText: { flex: 1, gap: spacing.xs },
  privacyCard: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.goldSoft },
  privacyText: { flex: 1, gap: spacing.xs },
  comingSoonSection: { position: "relative", marginHorizontal: spacing.lg },
  comingSoonContent: { opacity: 0.46 },
  sectionTitle: { marginBottom: spacing.md },
  familyRow: { minHeight: layout.minimumTouchTarget, flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  familyDot: { width: spacing.sm + spacing.xs, height: spacing.sm + spacing.xs, borderRadius: radius.full, backgroundColor: colors.accent },
  familyText: { flex: 1 },
  comingSoonBadge: { position: "absolute", top: 0, right: 0 },
});

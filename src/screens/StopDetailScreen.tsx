import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { MapModel, MapPoint } from "../adapters/map";
import { ExpoMapsView } from "../adapters/map/expo-maps-view";
import type {
  ItineraryItem,
  Reservation,
  Stop,
  TravelDocument,
  UUID,
} from "../modules/_shared/model";
import { colors, layout, radius, shadows, spacing } from "../theme";
import {
  AppText,
  Badge,
  Button,
  Icon,
  IconButton,
  InlineMessage,
  SectionTitle,
  Skeleton,
} from "../ui";
import {
  formatDocumentDate,
  formatDocumentSize,
  formatReservationDate,
  formatReservationTime,
  labelDocumentKind,
  labelReservationType,
} from "./travel-records-model";
import {
  formatItineraryLocalDate,
  formatItineraryLocalTime,
  formatStopDateRange,
  stopDayCount,
} from "./stop-detail-model";

type StopDetailTab = "itinerary" | "documents" | "reservations";

export interface StopDetailScreenProps {
  tripName: string;
  stop: Stop | null;
  itinerary: ItineraryItem[];
  documents: TravelDocument[];
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  downloadedDocumentId: UUID | null;
  onBack: () => void;
  onRetry: () => Promise<void>;
  onDownload: (document: TravelDocument) => Promise<void>;
  onOpenItinerary: () => void;
  onOpenDocuments: () => void;
  onOpenReservations: () => void;
  weather?: StopWeatherViewModel;
}

export interface StopWeatherViewModel { status: "loading" | "ready" | "unavailable" | "error"; errorMessage?: string; updatedAt?: string; days?: { date: string; weatherCode: number; temperatureMinC: number; temperatureMaxC: number; precipitationProbabilityMax?: number; precipitationSumMm?: number; uvIndexMax?: number; windGustsMaxKmh?: number }[]; current?: { temperatureC: number; apparentTemperatureC?: number; weatherCode: number }; onRetry?: () => Promise<void> }

export function buildStopMapModel(itinerary: ItineraryItem[]): MapModel {
  const points: MapPoint[] = [];

  for (const item of itinerary) {
    const place = item.place;
    if (!place?.coordinates) continue;

    points.push({
      id: item.id,
      label: place.label,
      coordinates: place.coordinates,
    });
  }

  return { points };
}

export function StopDetailScreen(props: StopDetailScreenProps) {
  const [tab, setTab] = useState<StopDetailTab>("itinerary");
  const [expandedItemId, setExpandedItemId] = useState<UUID | null>(null);
  const mapModel = useMemo(() => buildStopMapModel(props.itinerary), [props.itinerary]);

  if (props.loading && !props.stop) return <StopDetailLoading onBack={props.onBack} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton
            icon={<Icon name="arrow-left" size={20} />}
            onPress={props.onBack}
            accessibilityLabel="Retour au Voyage"
          />
          <View style={styles.headerText}>
            <AppText variant="h3">Détail de l’Étape</AppText>
            <AppText variant="caption" color="muted">{props.tripName}</AppText>
          </View>
          <IconButton
            icon={<Icon name="refresh" size={20} />}
            onPress={() => void props.onRetry()}
            disabled={props.loading}
            accessibilityLabel="Actualiser l’Étape"
          />
        </View>

        {props.error ? (
          <View style={styles.message}>
            <InlineMessage variant="error" title="Étape indisponible" message={props.error} />
            <Button variant="secondary" onPress={() => void props.onRetry()}>Réessayer</Button>
          </View>
        ) : null}

        {props.stop ? (
          <>
            <View style={[styles.hero, shadows.md]}>
              <View style={styles.heroIcon}><Icon name="map-pin" size={24} color={colors.white} /></View>
              <View style={styles.heroText}>
                <AppText variant="h1" color="onAccent">{props.stop.name}</AppText>
                <AppText variant="bodySmall" color="onAccent">
                  {props.stop.countryCode} · {formatStopDateRange(props.stop)}
                </AppText>
                <View style={styles.timeZoneRow}>
                  <Icon name="clock" size={14} color={colors.white} />
                  <AppText variant="caption" color="onAccent">{props.stop.timeZone}</AppText>
                </View>
              </View>
            </View>

            <View style={styles.stats}>
              <Stat value={String(stopDayCount(props.stop))} label="Jours" />
              <Stat value={String(props.itinerary.length)} label="Éléments" />
              <Stat value={String(props.documents.length)} label="Documents" />
            </View>

            <View accessibilityRole="tablist" style={styles.tabs}>
              <Tab label="Itinéraire" active={tab === "itinerary"} onPress={() => setTab("itinerary")} />
              <Tab label="Documents" active={tab === "documents"} onPress={() => setTab("documents")} />
              <Tab label="Réservations" active={tab === "reservations"} onPress={() => setTab("reservations")} />
            </View>

            {tab === "itinerary" ? (
              <View style={styles.section}>
                <SectionTitle title="Itinéraire de l’Étape" />
                <View style={styles.mapPreview}>
                  {mapModel.points.length > 0 ? (
                    <ExpoMapsView
                      model={mapModel}
                      style={styles.mapSurface}
                      testID="stop-detail-map"
                    />
                  ) : (
                    <View style={styles.mapEmpty} testID="stop-detail-map-empty">
                      <Icon name="map" size={32} color={colors.teal} />
                      <AppText variant="label" align="center">Aucun lieu géolocalisé</AppText>
                      <AppText variant="caption" color="muted" align="center">
                        Les éléments de l’Étape restent disponibles dans la timeline ci-dessous.
                      </AppText>
                    </View>
                  )}
                  {mapModel.points.length > 0 ? (
                    <AppText variant="caption" color="muted" align="center" style={styles.mapSummary}>
                      {mapModel.points.length} lieu{mapModel.points.length > 1 ? "x" : ""} géolocalisé{mapModel.points.length > 1 ? "s" : ""} dans cette Étape.
                    </AppText>
                  ) : null}
                  <Button size="sm" variant="secondary" onPress={props.onOpenItinerary} icon={<Icon name="map" size={16} color={colors.teal} />}>Ouvrir la carte</Button>
                </View>

                {props.itinerary.length === 0 ? (
                  <InlineMessage title="Aucun élément prévu" message="Aucun lieu ou rendez-vous confirmé n’est associé à cette Étape." />
                ) : (
                  <View style={styles.timeline}>
                    <View style={styles.timelineLine} />
                    {props.itinerary.map((item) => (
                      <ItineraryCard
                        key={item.id}
                        item={item}
                        expanded={expandedItemId === item.id}
                        onPress={() => setExpandedItemId((current) => current === item.id ? null : item.id)}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            {tab === "documents" ? (
              <View style={styles.section}>
                <SectionTitle title="Documents associés" />
                {props.downloadedDocumentId ? <InlineMessage variant="success" title="Document téléchargé" message="Une copie persistante privée est disponible sur cet iPhone." /> : null}
                {props.documents.length === 0 ? (
                  <InlineMessage title="Aucun Document" message="Les Documents non classés peuvent être associés à cette Étape depuis le Module Documents." />
                ) : props.documents.map((document) => (
                  <View key={document.id} style={styles.documentCard}>
                    <View style={styles.documentIcon}><Icon name="file-text" size={20} color={colors.teal} /></View>
                    <View style={styles.cardText}>
                      <AppText variant="label" numberOfLines={1}>{document.fileName ?? "Document sans nom"}</AppText>
                      <AppText variant="caption" color="muted">{labelDocumentKind(document.kind)} · {formatDocumentSize(document.byteSize)}</AppText>
                      <AppText variant="caption" color="muted">Ajouté le {formatDocumentDate(document.createdAt)}</AppText>
                      <Badge label="Privé" variant="teal" />
                    </View>
                    <Button size="sm" variant="secondary" onPress={() => void props.onDownload(document)}>Voir</Button>
                  </View>
                ))}
                <Button fullWidth variant="secondary" onPress={props.onOpenDocuments}>Voir tous les Documents</Button>
              </View>
            ) : null}

            {tab === "reservations" ? (
              <View style={styles.section}>
                <SectionTitle title="Réservations liées" />
                <View style={styles.confirmationNote}>
                  <Icon name="check" size={20} color={colors.success} />
                  <AppText variant="bodySmall" color="muted" style={styles.flexOne}>Seules les Réservations confirmées et explicitement reliées à un Document de cette Étape apparaissent ici.</AppText>
                </View>
                {props.reservations.length === 0 ? (
                  <InlineMessage title="Aucune Réservation liée" message="Les Réservations sans lien explicite restent visibles dans la liste du Voyage." />
                ) : (
                  <View style={styles.reservationTimeline}>
                    <View style={styles.reservationLine} />
                    {props.reservations.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} />)}
                  </View>
                )}
                <Button fullWidth variant="secondary" onPress={props.onOpenReservations}>Voir toutes les Réservations</Button>
              </View>
            ) : null}

            <View style={styles.section}>
              <SectionTitle title="Préparation de l’Étape" />
              <View style={styles.futureGrid}>
                <StopWeather weather={props.weather} />
                <ComingSoonCard icon="check" title="Packing" message="Liste indépendante par Étape" />
                <ComingSoonCard icon="users" title="Activité sociale" message="Présence et position en temps réel" />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}>
      <AppText variant="caption" color={active ? "onAccent" : "muted"} align="center">{label}</AppText>
    </Pressable>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><AppText variant="h3" align="center">{value}</AppText><AppText variant="caption" color="muted" align="center">{label}</AppText></View>;
}

function ItineraryCard({ item, expanded, onPress }: { item: ItineraryItem; expanded: boolean; onPress: () => void }) {
  const timeZone = item.time?.timeZone;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onPress} style={({ pressed }) => [styles.timelineItem, pressed && styles.pressed]}>
      <View style={styles.timelineDot} />
      <AppText variant="caption" color="muted">{formatItineraryLocalDate(item.date)} · {formatItineraryLocalTime(item)}</AppText>
      <AppText variant="label">{item.title}</AppText>
      <View style={styles.badgeRow}>
        <Badge label={item.place ? "Lieu confirmé" : "Programme"} variant={item.place ? "teal" : "gold"} />
        {timeZone ? <AppText variant="caption" color="muted">{timeZone}</AppText> : null}
      </View>
      {expanded ? (
        <View style={styles.timelineDetail}>
          {item.place ? <DetailRow icon="map-pin" text={item.place.address ? `${item.place.label} · ${item.place.address}` : item.place.label} /> : null}
          {item.notes ? <DetailRow icon="file-text" text={item.notes} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function DetailRow({ icon, text }: { icon: "map-pin" | "file-text"; text: string }) {
  return <View style={styles.detailRow}><Icon name={icon} size={14} color={colors.muted} /><AppText variant="caption" color="muted" style={styles.flexOne}>{text}</AppText></View>;
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const time = formatReservationTime(reservation);
  return (
    <View style={styles.reservationItem}>
      <View style={styles.reservationDot} />
      <AppText variant="badge" color="accent">{formatReservationDate(reservation)}</AppText>
      <View style={styles.reservationCard}>
        <View style={styles.badgeRow}><Badge label={labelReservationType(reservation.type)} variant="teal" /><Badge label="Confirmée" variant="success" /></View>
        <AppText variant="label">{reservation.title}</AppText>
        {time ? <AppText variant="caption" color="muted">{time} · {reservation.start?.timeZone}</AppText> : null}
        {reservation.provider ? <AppText variant="caption" color="muted">{reservation.provider}</AppText> : null}
        {reservation.reference ? <AppText variant="caption" color="muted">Réf. {reservation.reference}</AppText> : null}
      </View>
    </View>
  );
}

function ComingSoonCard({ icon, title, message }: { icon: "calendar" | "check" | "users"; title: string; message: string }) {
  return (
    <View accessible accessibilityLabel={`${title}, à venir`} accessibilityState={{ disabled: true }} style={styles.futureCard}>
      <View pointerEvents="none" style={styles.futureContent}>
        <Icon name={icon} size={20} color={colors.muted} />
        <View style={styles.flexOne}><AppText variant="label" color="muted">{title}</AppText><AppText variant="caption" color="muted">{message}</AppText></View>
      </View>
      <Badge label="À venir" variant="gold" />
    </View>
  );
}

function StopWeather({ weather }: { weather?: StopWeatherViewModel }) {
  if (!weather || weather.status === "unavailable") return <ComingSoonCard icon="calendar" title="Météo" message={weather?.errorMessage ?? "Prévisions indisponibles"} />;
  if (weather.status === "loading") return <View style={styles.weatherCard}><Skeleton height={spacing.lg} /><Skeleton height={spacing.md} width="70%" /></View>;
  if (weather.status === "error") return <View style={styles.weatherCard}><InlineMessage variant="error" title="Météo indisponible" message={weather.errorMessage ?? "Impossible de charger la météo."} />{weather.onRetry ? <Button size="sm" variant="secondary" onPress={() => void weather.onRetry?.()}>Réessayer</Button> : null}</View>;
  const day = weather.days?.[0];
  if (!day) return <ComingSoonCard icon="calendar" title="Météo" message="Aucune prévision disponible" />;
  return <View style={styles.weatherCard}><View style={styles.weatherHeading}><Icon name="calendar" size={20} color={colors.teal} /><View style={styles.flexOne}><AppText variant="label">Météo</AppText><AppText variant="caption" color="muted">Prévisions Open‑Meteo</AppText></View><AppText variant="h3">{Math.round(day.temperatureMaxC)}°</AppText></View><AppText variant="bodySmall">Min {Math.round(day.temperatureMinC)}° · Pluie {Math.round(day.precipitationProbabilityMax ?? 0)}%</AppText></View>;
}

function StopDetailLoading({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.screen}>
      <View style={styles.loading}>
        <IconButton icon={<Icon name="arrow-left" size={20} />} onPress={onBack} accessibilityLabel="Retour au Voyage" />
        <Skeleton height={spacing["2xl"] * 3} borderRadius={radius.lg} />
        <View style={styles.stats}><Skeleton width="30%" height={spacing["2xl"] * 2} /><Skeleton width="30%" height={spacing["2xl"] * 2} /><Skeleton width="30%" height={spacing["2xl"] * 2} /></View>
        <Skeleton height={spacing["2xl"] * 4} borderRadius={radius.md} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingBottom: spacing["2xl"] },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  headerText: { flex: 1, gap: spacing.xs },
  message: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.accent },
  heroIcon: { width: spacing["2xl"], height: spacing["2xl"], borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.overlay },
  heroText: { flex: 1, gap: spacing.xs },
  timeZoneRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  stats: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg },
  stat: { flex: 1, minHeight: layout.minimumTouchTarget + spacing.lg, alignItems: "center", justifyContent: "center", gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  tabs: { flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  tab: { flex: 1, minHeight: layout.minimumTouchTarget, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xs, borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.fg, borderColor: colors.fg },
  section: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  mapPreview: { overflow: "hidden", gap: spacing.sm, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  mapSurface: { width: "100%", height: spacing["2xl"] * 5 },
  mapEmpty: { minHeight: spacing["2xl"] * 3, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.tealSoft },
  mapSummary: { paddingHorizontal: spacing.md },
  timeline: { position: "relative", paddingLeft: spacing.lg },
  timelineLine: { position: "absolute", left: spacing.sm, top: spacing.md, bottom: spacing.md, width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  timelineItem: { position: "relative", minHeight: layout.minimumTouchTarget, gap: spacing.xs, paddingLeft: spacing.md, paddingVertical: spacing.md },
  timelineDot: { position: "absolute", left: -spacing.lg + spacing.xs, top: spacing.lg, width: spacing.sm + spacing.xs, height: spacing.sm + spacing.xs, borderRadius: radius.full, backgroundColor: colors.accent, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.surface },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  timelineDetail: { gap: spacing.sm, marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  documentCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  documentIcon: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealSoft },
  cardText: { flex: 1, minWidth: "40%", gap: spacing.xs },
  confirmationNote: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.tealSoft },
  reservationTimeline: { position: "relative", paddingLeft: spacing.lg },
  reservationLine: { position: "absolute", left: spacing.sm, top: spacing.md, bottom: spacing.md, width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  reservationItem: { position: "relative", gap: spacing.xs, paddingLeft: spacing.md, paddingVertical: spacing.md },
  reservationDot: { position: "absolute", left: -spacing.lg + spacing.xs, top: spacing.lg, width: spacing.sm + spacing.xs, height: spacing.sm + spacing.xs, borderRadius: radius.full, backgroundColor: colors.accent, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.surface },
  reservationCard: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  futureGrid: { gap: spacing.sm },
  weatherCard: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  weatherHeading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  futureCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderStyle: "dashed", borderColor: colors.border, backgroundColor: colors.surface },
  futureContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md, opacity: 0.5 },
  flexOne: { flex: 1 },
  pressed: { transform: [{ scale: 0.97 }] },
  loading: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", gap: spacing.lg, padding: spacing.lg },
});

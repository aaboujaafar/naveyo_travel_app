import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { MapModel, MapPoint } from "../adapters/map";
import { ExpoMapsView } from "../adapters/map/expo-maps-view";
import type {
  ItineraryItem,
  PlaceCandidate,
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
  DatePickerField,
  Icon,
  IconButton,
  InlineMessage,
  Input,
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
import type { StopDiscoveryKind, StopDiscoverySection } from "./stop-discovery-model";
import { placeAttribution } from "../modules/places";

type StopDetailTab = "itinerary" | "discover" | "documents" | "reservations";

export interface ActivitySchedule { date: string; time?: string }
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
  onEditLocation?: () => void;
  weather?: StopWeatherViewModel;
  discovery?: StopDiscoveryViewModel;
  addingPlaceId?: UUID | null;
  onAddDiscovery?: (place: PlaceCandidate, kind: StopDiscoveryKind, schedule: ActivitySchedule) => Promise<void>;
  manualPlaceSearch?: ManualPlaceSearchViewModel;
  onAddReservationToItinerary?: (reservation: Reservation) => Promise<void>;
  addingReservationId?: UUID | null;
  addedReservationIds?: UUID[];
}

export interface StopWeatherViewModel { status: "loading" | "ready" | "unavailable" | "error"; errorMessage?: string; updatedAt?: string; days?: { date: string; weatherCode: number; temperatureMinC: number; temperatureMaxC: number; precipitationProbabilityMax?: number; precipitationSumMm?: number; uvIndexMax?: number; windGustsMaxKmh?: number }[]; current?: { temperatureC: number; apparentTemperatureC?: number; weatherCode: number }; onRetry?: () => Promise<void> }
export interface StopDiscoveryViewModel { status: "loading" | "ready" | "error"; sections: StopDiscoverySection[]; errorMessage?: string }
export interface ManualPlaceSearchViewModel {
  query: string;
  results: PlaceCandidate[];
  loading: boolean;
  onQueryChange: (query: string) => void;
  onSearch: () => Promise<void>;
}

export function buildStopMapModel(itinerary: ItineraryItem[], stop?: Stop): MapModel {
  const points: MapPoint[] = [];

  if (stop?.coordinates) {
    points.push({ id: `stop-${stop.id}`, label: stop.name, coordinates: stop.coordinates });
  }

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
  const mapModel = useMemo(() => buildStopMapModel(props.itinerary, props.stop ?? undefined), [props.itinerary, props.stop]);

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
          {props.onEditLocation ? <IconButton icon={<Icon name="edit" size={20} />} onPress={props.onEditLocation} accessibilityLabel="Modifier la localisation" /> : null}
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
              <Tab label="Découvrir" active={tab === "discover"} onPress={() => setTab("discover")} />
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

            {tab === "discover" ? (
              <DiscoveryContent
                discovery={props.discovery}
                itinerary={props.itinerary}
                addingPlaceId={props.addingPlaceId}
                onAdd={props.onAddDiscovery}
                manualPlaceSearch={props.manualPlaceSearch}
                stop={props.stop}
              />
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
                  <AppText variant="bodySmall" color="muted" style={styles.flexOne}>Les réservations confirmées avec un lieu ou un transfert renseigné peuvent être ajoutées au programme de cette Étape.</AppText>
                </View>
                {props.reservations.length === 0 ? (
                  <InlineMessage title="Aucune Réservation liée" message="Les Réservations sans lien explicite restent visibles dans la liste du Voyage." />
                ) : (
                  <View style={styles.reservationTimeline}>
                    <View style={styles.reservationLine} />
                  {props.reservations.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} onAddToItinerary={props.onAddReservationToItinerary && (reservation.venue || reservation.origin || reservation.destination) && !props.addedReservationIds?.includes(reservation.id) ? () => void props.onAddReservationToItinerary?.(reservation) : undefined} adding={props.addingReservationId === reservation.id} added={props.addedReservationIds?.includes(reservation.id)} />)}
                  </View>
                )}
                <Button fullWidth variant="secondary" onPress={props.onOpenReservations}>Voir toutes les Réservations</Button>
              </View>
            ) : null}

            <View style={styles.section}>
              <SectionTitle title="Préparation de l’Étape" />
              <View style={styles.futureGrid}>
                <StopWeather weather={props.weather} />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DiscoveryContent({
  discovery,
  itinerary,
  addingPlaceId,
  onAdd,
  manualPlaceSearch,
  stop,
}: {
  discovery?: StopDiscoveryViewModel;
  itinerary: ItineraryItem[];
  addingPlaceId?: UUID | null;
  onAdd?: (place: PlaceCandidate, kind: StopDiscoveryKind, schedule: ActivitySchedule) => Promise<void>;
  manualPlaceSearch?: ManualPlaceSearchViewModel;
  stop: Stop | null;
}) {
  const addedPlaceIds = new Set(itinerary.map((item) => item.place?.placeId).filter(Boolean));
  const [date, setDate] = useState(stop?.startDate ?? "");
  const [time, setTime] = useState("");
  if (!discovery || discovery.status === "loading") {
    return <View style={styles.section}><SectionTitle title="Autour de cette Étape" /><Skeleton height={spacing["2xl"] * 3} borderRadius={radius.md} /><Skeleton height={spacing["2xl"] * 3} borderRadius={radius.md} /></View>;
  }
  if (discovery.status === "error") {
    return <View style={styles.section}><SectionTitle title="Autour de cette Étape" /><InlineMessage variant="error" title="Suggestions indisponibles" message={discovery.errorMessage ?? "Impossible de charger les idées à proximité."} /></View>;
  }
  return (
    <View style={styles.section}>
      <SectionTitle title="Autour de cette Étape" />
      <InlineMessage title="Des idées prêtes à planifier" message="Les lieux viennent de Places. Choisis le jour et, si besoin, l’heure avant d’ajouter." />
      {stop ? <View style={styles.schedulePanel}>
        <AppText variant="label">Quand veux-tu le faire ?</AppText>
        <DatePickerField label="Jour" value={date} onChange={setDate} minimumDate={stop.startDate} maximumDate={stop.endDate} />
        <Input label="Heure (facultatif)" value={time} onChangeText={setTime} placeholder="Ex. 14:30" keyboardType="numbers-and-punctuation" maxLength={5} />
      </View> : null}
      {manualPlaceSearch ? (
        <View style={styles.manualSearch}>
          <AppText variant="label">Ajouter une activité ou un lieu</AppText>
          <View style={styles.manualSearchRow}>
            <Input value={manualPlaceSearch.query} onChangeText={manualPlaceSearch.onQueryChange} placeholder="Ex. cours de cuisine, musée…" containerStyle={styles.manualSearchInput} returnKeyType="search" onSubmitEditing={() => void manualPlaceSearch.onSearch()} />
            <Button size="sm" variant="secondary" disabled={manualPlaceSearch.loading || manualPlaceSearch.query.trim().length < 2} onPress={() => void manualPlaceSearch.onSearch()}>{manualPlaceSearch.loading ? "Recherche…" : "Chercher"}</Button>
          </View>
          {manualPlaceSearch.results.map((place) => (
            <View key={`manual-${place.id}`} style={styles.discoveryCard}>
              <View style={styles.discoveryCardBody}><AppText variant="label">{place.name}</AppText><AppText variant="caption" color="muted" numberOfLines={2}>{[place.address, place.category].filter(Boolean).join(" · ") || "Lieu géocodé"}</AppText></View>
              <Button size="sm" variant="primary" disabled={!onAdd || !date} onPress={() => void onAdd?.(place, "activity", { date, time: normalizeTime(time) })} icon={<Icon name="plus" size={16} color={colors.white} />}>Ajouter</Button>
            </View>
          ))}
        </View>
      ) : null}
      {discovery.sections.map((section) => (
        <View key={section.kind} style={styles.discoverySection}>
          <View style={styles.discoveryHeading}>
            <View style={styles.discoveryIcon}><Icon name={section.kind === "specialty" ? "sparkles" : section.kind === "activity" ? "map" : "map-pin"} size={20} color={colors.teal} /></View>
            <View style={styles.flexOne}>
              <AppText variant="h3">{section.title}</AppText>
              <AppText variant="caption" color="muted">{section.description}</AppText>
            </View>
          </View>
          {section.places.length === 0 ? (
            <AppText variant="caption" color="muted">Aucune adresse trouvée dans cette catégorie.</AppText>
          ) : section.places.map((place) => {
            const added = addedPlaceIds.has(place.id);
            const attribution = placeAttribution(place.provider, place.attribution);
            return (
              <View key={`${section.kind}-${place.id}`} style={styles.discoveryCard}>
                <View style={styles.discoveryCardBody}>
                  <AppText variant="label">{place.name}</AppText>
                  <AppText variant="caption" color="muted" numberOfLines={2}>
                    {[place.category, place.address, formatDistance(place.distanceMeters)].filter(Boolean).join(" · ") || "Lieu proposé à proximité"}
                  </AppText>
                  {attribution ? <AppText variant="badge" color="muted">{attribution}</AppText> : null}
                </View>
                <Button
                  size="sm"
                  variant={added ? "secondary" : "primary"}
                  disabled={added || addingPlaceId === place.id || !onAdd}
                  onPress={() => void onAdd?.(place, section.kind, { date, time: normalizeTime(time) })}
                  icon={<Icon name={added ? "check" : "plus"} size={16} color={added ? colors.teal : colors.white} />}
                >
                  {added ? "Ajouté" : addingPlaceId === place.id ? "Ajout…" : "Ajouter"}
                </Button>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function formatDistance(value?: number): string | null {
  if (value == null) return null;
  return value >= 1_000 ? `${(value / 1_000).toFixed(1)} km` : `${Math.round(value)} m`;
}

function normalizeTime(value: string): string | undefined {
  const trimmed = value.trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) ? trimmed : undefined;
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

function ReservationCard({ reservation, onAddToItinerary, adding, added }: { reservation: Reservation; onAddToItinerary?: () => void; adding?: boolean; added?: boolean }) {
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
        {added ? <Badge label="Ajoutée à l’Étape" variant="success" /> : onAddToItinerary ? <Button size="sm" variant="secondary" loading={adding} onPress={onAddToItinerary} icon={<Icon name="calendar" size={16} color={colors.teal} />}>Ajouter à l’Étape</Button> : null}
      </View>
    </View>
  );
}

function StopWeather({ weather }: { weather?: StopWeatherViewModel }) {
  if (!weather || weather.status === "unavailable") return <View style={styles.weatherCard}><InlineMessage title="Météo indisponible" message={weather?.errorMessage ?? "Prévisions indisponibles"} /></View>;
  if (weather.status === "loading") return <View style={styles.weatherCard}><Skeleton height={spacing.lg} /><Skeleton height={spacing.md} width="70%" /></View>;
  if (weather.status === "error") return <View style={styles.weatherCard}><InlineMessage variant="error" title="Météo indisponible" message={weather.errorMessage ?? "Impossible de charger la météo."} />{weather.onRetry ? <Button size="sm" variant="secondary" onPress={() => void weather.onRetry?.()}>Réessayer</Button> : null}</View>;
  const days = weather.days ?? [];
  if (!days.length) return <View style={styles.weatherCard}><InlineMessage title="Aucune prévision" message="Aucune donnée météo n’est disponible pour cette Étape." /></View>;
  return <View style={styles.weatherCard}><View style={styles.weatherHeading}><Icon name="calendar" size={20} color={colors.teal} /><View style={styles.flexOne}><AppText variant="label">Météo de l’Étape</AppText><AppText variant="caption" color="muted">Prévisions Open‑Meteo · {days.length} jour{days.length > 1 ? "s" : ""}</AppText></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weatherDays}>{days.map((day) => <View key={day.date} style={styles.weatherDay}><AppText variant="badge" color="muted">{formatWeatherDateLabel(day.date)}</AppText><AppText variant="h3">{Math.round(day.temperatureMaxC)}°</AppText><AppText variant="caption" color="muted">Min {Math.round(day.temperatureMinC)}°</AppText><AppText variant="caption" color="muted">Pluie {Math.round(day.precipitationProbabilityMax ?? 0)}%</AppText></View>)}</ScrollView></View>;
}

function formatWeatherDateLabel(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(date);
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
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
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
  discoverySection: { gap: spacing.sm, paddingTop: spacing.sm },
  discoveryHeading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  discoveryIcon: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: colors.tealSoft },
  discoveryCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  discoveryCardBody: { flex: 1, minWidth: 0, gap: spacing.xs },
  manualSearch: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tealSoft },
  manualSearchRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  manualSearchInput: { flex: 1 },
  schedulePanel: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
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
  weatherDays: { gap: spacing.sm, paddingTop: spacing.xs },
  weatherDay: { minWidth: spacing["2xl"] * 2, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.tealSoft, gap: spacing.xs },
  futureCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderStyle: "dashed", borderColor: colors.border, backgroundColor: colors.surface },
  futureContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md, opacity: 0.5 },
  flexOne: { flex: 1 },
  pressed: { transform: [{ scale: 0.97 }] },
  loading: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", gap: spacing.lg, padding: spacing.lg },
});

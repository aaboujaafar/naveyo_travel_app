import { useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop as GradientStop } from "react-native-svg";
import { DestinationImage } from "../ui/DestinationImage";
import type { Coordinates, ItineraryItem, Reservation, Stop, Trip } from "../modules/_shared/model";
import {
  colors,
  componentMetrics,
  layout,
  radius,
  shadows,
  spacing,
  zIndex,
} from "../theme";
import { AppText, Badge, Button, Icon, InlineMessage, Skeleton } from "../ui";
import {
  countTripDays,
  formatTripDateRange,
  buildPreparationSteps,
  formatStopSummary,
  getTravelerCount,
  sortStopsByLocalDate,
} from "./trip-dashboard-model";
import { formatDuration, type TodayEntry, type TodayPlan } from "./today-model";
import { isTripOver, localToday, tripTiming } from "./trips-list-model";
import { isRainyDay } from "./weather-plan-b";
import type { ClimateSummary } from "../modules/weather";


export interface TripDashboardScreenProps {
  trip: Trip | null;
  stops: Stop[];
  itineraryItems: ItineraryItem[];
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onOpenTrips: () => void;
  onOpenSettings: () => void;
  onOpenAssistant: () => void;
  /** Opens Explorer on the AI day composer. Falls back to onOpenAssistant. */
  onComposeDay?: () => void;
  onOpenItinerary: () => void;
  onOpenStop: (stop: Stop) => void;
  onOpenCreateStop: () => void;
  onOpenExpenses: () => void;
  onOpenReservations: () => void;
  onOpenDocuments: () => void;
  onOpenPacking: () => void;
  weather?: DashboardWeatherState;
  weatherByStopId?: Record<string, DashboardWeatherState>;
  routePolyline?: Coordinates[];
  /** Set while the Voyage is under way: the dashboard becomes the day. */
  today?: TodayPlan | null;
  /** Walking time to the next activity of the day, when it could be computed. */
  travelToNextSeconds?: number | null;
  onOpenDirections?: (entry: TodayEntry) => void;
  summary?: DashboardSummary;
  /** Answers questions from the Voyage's own data, offline included. */
  onOpenQuestions?: () => void;
  /** Composes a rainy day with indoor places. */
  onPlanB?: (date: string) => void;
  /** Shown once the Voyage is over. */
  onOpenRecap?: () => void;
  /** True when the screen shows the last offline download because the network failed. */
  offlineSnapshot?: boolean;
  /** Whether an offline download of the Voyage exists on this device. */
  offlineReady?: boolean;
}

export interface DashboardSummary {
  budget?: { spent: string; planned: string | null; progress: number } | null;
  packing?: { packed: number; total: number } | null;
}

export interface DashboardWeatherState { status: "loading" | "ready" | "empty" | "error"; message?: string; updatedAt?: string; climate?: ClimateSummary; days?: { date: string; label: string; icon: string; temperatureMin: number; temperatureMax: number; precipitationProbabilityMax?: number }[] }


export function TripDashboardScreen(props: TripDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showMemberNotice, setShowMemberNotice] = useState(true);
  const sortedStops = useMemo(() => sortStopsByLocalDate(props.stops), [props.stops]);
  const topControlsStyle = useMemo(
    () => ({ paddingTop: Math.max(insets.top, spacing.md) }),
    [insets.top],
  );

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await props.onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  if (props.loading && !props.trip) {
    return <DashboardLoadingState />;
  }

  if (props.error && !props.trip) {
    return (
      <View style={styles.centeredState}>
        <InlineMessage
          variant="error"
          title="Chargement impossible"
          message={props.error}
        />
        <ActionPill label="Réessayer" onPress={() => void refresh()} />
      </View>
    );
  }

  if (!props.trip) {
    return (
      <View style={styles.centeredState}>
        <InlineMessage
          title="Voyage introuvable"
          message="Ce Voyage n'est plus accessible avec ce Compte."
        />
      </View>
    );
  }

  const trip = props.trip;
  const travelerCount = getTravelerCount(trip);
  const tripDays = countTripDays(trip.startsOn, trip.endsOn);

  return (
    <View style={styles.screen} testID="trip-dashboard-screen">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.teal}
          />
        }
      >
        <View style={styles.hero}>
          <DestinationImage
            name={trip.name}
            imageUrl={trip.imageUrl ?? props.stops[0]?.imageUrl}
            style={styles.heroImage}
          />
          <Svg style={styles.heroOverlay} width="100%" height="100%">
            <Defs>
              <LinearGradient id="dashboard-overlay" x1="0" y1="0" x2="0" y2="1">
                <GradientStop offset="0.35" stopColor={colors.fg} stopOpacity={0} />
                <GradientStop offset="1" stopColor={colors.fg} stopOpacity={0.78} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#dashboard-overlay)" />
          </Svg>

          <View style={[styles.heroControls, topControlsStyle]}>
            <RoundAction
              label="Retour à Mes Voyages"
              icon={<Icon name="arrow-left" size={20} />}
              onPress={props.onOpenTrips}
            />
            <RoundAction
              label="Réglages du Voyage"
              icon={<Icon name="settings" size={20} />}
              onPress={props.onOpenSettings}
            />
          </View>

          <View style={styles.heroContent}>
            <AppText variant="h2" color="onAccent" numberOfLines={2}>
              {trip.name}
            </AppText>
            <View style={styles.heroMeta}>
              <Meta icon="calendar" label={formatTripDateRange(trip.startsOn, trip.endsOn)} />
              <Meta
                icon="users"
                label={`${travelerCount} voyageur${travelerCount > 1 ? "s" : ""}`}
              />
              {tripDays ? <AppText variant="caption" color="onAccent">{tripDays} jours</AppText> : null}
            </View>
          </View>
        </View>


        {props.offlineSnapshot ? (
          <View style={styles.bannerWrap}>
            <InlineMessage title="Hors connexion" message="Affichage du dernier téléchargement du Voyage." />
          </View>
        ) : props.error ? (
          <View style={styles.bannerWrap}>
            <InlineMessage variant="error" title="Actualisation incomplète" message={props.error} />
          </View>
        ) : null}

        {showMemberNotice && trip.members.length > 1 ? (
          <DismissibleBanner
            message={`${trip.members.length} Comptes ont accès à ce Voyage privé.`}
            onDismiss={() => setShowMemberNotice(false)}
          />
        ) : null}

        {props.onOpenRecap && tripTiming(trip, localToday()).phase === "past" ? (
          <View style={styles.bannerWrap}>
            <Pressable accessibilityRole="button" onPress={props.onOpenRecap} style={({ pressed }) => [styles.aiDayCard, pressed && styles.pressed]}>
              <View style={styles.aiDayIcon}><Icon name="layers" size={22} color={colors.white} /></View>
              <View style={styles.flexOne}>
                <AppText variant="h3" color="onAccent">Le récap est prêt</AppText>
                <AppText variant="bodySmall" color="onAccent">Étapes, activités, kilomètres et dépenses du Voyage, à garder ou partager.</AppText>
              </View>
            </Pressable>
          </View>
        ) : null}

        <TodayPanel
            today={props.today ?? null}
            travelToNextSeconds={props.travelToNextSeconds ?? null}
            onOpenDirections={props.onOpenDirections}
            summary={props.summary}
            offlineReady={props.offlineReady}
            onPlanB={props.onPlanB}
            onOpenQuestions={props.onOpenQuestions}
            onComposeDay={props.onComposeDay ?? props.onOpenAssistant}
            tripOver={isTripOver(trip, localToday())}
            stops={sortedStops}
            itineraryItemCount={props.itineraryItems.length}
            reservations={props.reservations}
            weather={props.weather}
            onOpenExpenses={props.onOpenExpenses}
            onOpenItinerary={props.onOpenItinerary}
            onOpenStop={props.onOpenStop}
            onOpenCreateStop={props.onOpenCreateStop}
            onOpenReservations={props.onOpenReservations}
            onOpenDocuments={props.onOpenDocuments}
            onOpenPacking={props.onOpenPacking}
            weatherByStopId={props.weatherByStopId}
          />
      </ScrollView>

    </View>
  );
}

function DashboardWeather({ weather, hasStops, onPlanB }: { weather?: DashboardWeatherState; hasStops: boolean; onPlanB?: (date: string) => void }) {
  if (!hasStops) return null;
  if (weather?.status === "loading") return <Section title="Météo"><Skeleton height={spacing.xl * 2} borderRadius={radius.md} /></Section>;
  const days = weather?.status === "ready" ? weather.days ?? [] : [];
  if (days.length === 0 && weather?.climate) {
    const climate = weather.climate;
    return (
      <Section title="Météo">
        <View style={styles.climateCard}>
          <AppText variant="h3">{`${climate.temperatureMaxC}° / ${climate.temperatureMinC}°`}</AppText>
          <AppText variant="bodySmall" color="muted">
            {`À ces dates en ${climate.year} : ${climate.rainyDays === 0 ? "aucun jour de pluie" : `${climate.rainyDays} jour${climate.rainyDays > 1 ? "s" : ""} de pluie sur ${climate.days}`}. Les prévisions arriveront 16 jours avant le départ.`}
          </AppText>
        </View>
      </Section>
    );
  }
  if (days.length === 0) {
    const message = weather?.status === "error" ? "Météo momentanément indisponible." : "La météo s’affichera 16 jours avant le départ.";
    return <View style={styles.weatherNote}><Icon name="info" size={16} color={colors.muted} /><AppText variant="caption" color="muted" style={styles.flexOne}>{message}</AppText></View>;
  }
  return <Section title="Météo"><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weatherStrip}>{days.slice(0, 7).map((day) => <View key={day.date} style={styles.weatherDay}><AppText variant="badge" color="muted">{day.label}</AppText><AppText variant="h3">{day.icon}</AppText><AppText variant="label">{Math.round(day.temperatureMax)}°</AppText><AppText variant="caption" color="muted">Min {Math.round(day.temperatureMin)}°</AppText>{day.precipitationProbabilityMax !== undefined ? <AppText variant="badge" color="muted">Pluie {Math.round(day.precipitationProbabilityMax)}%</AppText> : null}{onPlanB && isRainyDay(day) ? <Pressable accessibilityRole="button" accessibilityLabel={`Plan B à l’abri pour ${day.label}`} onPress={() => onPlanB(day.date)} style={({ pressed }) => [styles.planBChip, pressed && styles.pressed]}><AppText variant="badge" color="teal">☔ Plan B</AppText></Pressable> : null}</View>)}</ScrollView></Section>;
}

function StepWeatherPreview({ weather }: { weather?: DashboardWeatherState }) {
  if (!weather || weather.status === "loading") return <AppText variant="caption" color="muted">Météo : chargement…</AppText>;
  if (weather.status !== "ready") return null;
  if (!weather.days?.length) return null;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepWeatherStrip}>{weather.days.map((day) => <View key={day.date} style={styles.stepWeatherDay}><AppText variant="badge" color="muted">{day.label}</AppText><AppText variant="label">{day.icon} {Math.round(day.temperatureMax)}°</AppText><AppText variant="caption" color="muted">Min {Math.round(day.temperatureMin)}° · Pluie {day.precipitationProbabilityMax ?? 0}%</AppText></View>)}</ScrollView>;
}

function TodayPanel({
  today,
  travelToNextSeconds,
  onOpenDirections,
  summary,
  offlineReady,
  onPlanB,
  onOpenQuestions,
  onComposeDay,
  tripOver,
  stops,
  itineraryItemCount,
  reservations,
  weather,
  onOpenExpenses,
  onOpenItinerary,
  onOpenStop,
  onOpenCreateStop,
  onOpenReservations,
  onOpenDocuments,
  onOpenPacking,
  weatherByStopId,
}: {
  today: TodayPlan | null;
  travelToNextSeconds: number | null;
  onOpenDirections?: (entry: TodayEntry) => void;
  summary?: DashboardSummary;
  offlineReady?: boolean;
  onPlanB?: (date: string) => void;
  onOpenQuestions?: () => void;
  onComposeDay: () => void;
  /** A finished Voyage shows neither its preparation nor day composition. */
  tripOver: boolean;
  stops: Stop[];
  itineraryItemCount: number;
  reservations: Reservation[];
  weather?: DashboardWeatherState;
  onOpenExpenses: () => void;
  onOpenItinerary: () => void;
  onOpenStop: (stop: Stop) => void;
  onOpenCreateStop: () => void;
  onOpenReservations: () => void;
  onOpenDocuments: () => void;
  onOpenPacking: () => void;
  weatherByStopId?: Record<string, DashboardWeatherState>;
}) {
  const steps = buildPreparationSteps({ stops: stops.length, itineraryItems: itineraryItemCount, reservations: reservations.length, offlineReady });
  const doneCount = steps.filter((step) => step.done).length;
  const stepActions = { stop: onOpenCreateStop, places: onComposeDay, reservation: onOpenReservations, offline: onOpenItinerary };

  return (
    <View style={styles.todayPanel}>
      {today ? (
        <TodaySection
          today={today}
          rainExpected={Boolean(today.stop && weatherByStopId?.[today.stop.id]?.days?.some((day) => day.date === today.date && isRainyDay(day)))}
          onPlanB={onPlanB ? () => onPlanB(today.date) : undefined}
          travelToNextSeconds={travelToNextSeconds}
          onOpenDirections={onOpenDirections}
          onComposeDay={onComposeDay}
          onOpenItinerary={onOpenItinerary}
        />
      ) : null}

      {!today && !tripOver && stops.length > 0 && itineraryItemCount === 0 ? (
        <Section>
          <Pressable accessibilityRole="button" accessibilityLabel="Composer une journée avec l’IA" onPress={onComposeDay} style={({ pressed }) => [styles.aiDayCard, pressed && styles.pressed]}>
            <View style={styles.aiDayIcon}><Icon name="sparkles" size={22} color={colors.white} /></View>
            <View style={styles.flexOne}>
              <AppText variant="h3" color="onAccent">Aucune activité prévue</AppText>
              <AppText variant="bodySmall" color="onAccent">Laissez l’IA composer votre première journée à {stops[0]?.name}, avec des lieux réels et la météo.</AppText>
              <View style={styles.aiDayAction}>
                <AppText variant="label" color="teal">Composer une journée</AppText>
                <Icon name="arrow-right" size={16} color={colors.tealStrong} />
              </View>
            </View>
          </Pressable>
        </Section>
      ) : null}

      {today || tripOver ? null : <Section title="Préparation">
        <View style={styles.preparationCard}>
          <View style={styles.preparationHeader}>
            <AppText variant="h3">{doneCount === steps.length ? "Voyage prêt" : "Votre Voyage se prépare"}</AppText>
            <AppText variant="label" color="teal">{`${doneCount} sur ${steps.length}`}</AppText>
          </View>
          <View style={styles.preparationBar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {steps.map((step) => <View key={step.key} style={[styles.preparationSegment, step.done && styles.preparationSegmentDone]} />)}
          </View>
          {steps.map((step) => step.done ? (
            <View key={step.key} style={styles.preparationStep}>
              <View style={[styles.preparationCheck, styles.preparationCheckDone]}><Icon name="check" size={14} color={colors.white} /></View>
              <AppText variant="bodySmall" color="muted" style={styles.flexOne}>{step.label}</AppText>
            </View>
          ) : (
            <Pressable key={step.key} accessibilityRole="button" accessibilityLabel={step.label} onPress={stepActions[step.key]} style={({ pressed }) => [styles.preparationStep, pressed && styles.pressed]}>
              <View style={styles.preparationCheck} />
              <AppText variant="label" style={styles.flexOne}>{step.label}</AppText>
              <Icon name="arrow-right" size={16} color={colors.accentStrong} />
            </Pressable>
          ))}
        </View>
      </Section>}

      {/* Itinéraire, Explorer and Documents have their own tab: only what has no tab is summarised here. */}
      <Section>
        <View style={styles.quickActions}>
          <SummaryCard
            icon="wallet"
            label="Budget"
            value={summary?.budget ? summary.budget.spent : "—"}
            detail={summary?.budget ? (summary.budget.planned ? `sur ${summary.budget.planned}` : "dépensés") : "Aucune dépense"}
            progress={summary?.budget?.planned ? summary.budget.progress : undefined}
            onPress={onOpenExpenses}
          />
          <SummaryCard
            icon="check"
            label="Bagages"
            value={summary?.packing && summary.packing.total > 0 ? `${summary.packing.packed}/${summary.packing.total}` : "—"}
            detail={summary?.packing && summary.packing.total > 0 ? "prêts" : "Liste vide"}
            progress={summary?.packing && summary.packing.total > 0 ? summary.packing.packed / summary.packing.total : undefined}
            onPress={onOpenPacking}
          />
          <SummaryCard
            icon="calendar"
            label="Réservations"
            value={String(reservations.length)}
            detail={reservations.length > 1 ? "confirmées" : "confirmée"}
            onPress={onOpenReservations}
          />
        </View>
      </Section>

      {onOpenQuestions ? (
        <Section>
          <Pressable accessibilityRole="button" onPress={onOpenQuestions} style={({ pressed }) => [styles.bookingCard, pressed && styles.pressed]}>
            <View style={[styles.bookingIcon, styles.questionIcon]}><Icon name="message-circle" size={20} color={colors.tealStrong} /></View>
            <View style={styles.flexOne}>
              <AppText variant="label">Une question sur le Voyage ?</AppText>
              <AppText variant="caption" color="muted">Vol, hôtel, programme, budget… même sans réseau</AppText>
            </View>
            <Icon name="arrow-right" size={16} color={colors.fg} />
          </Pressable>
        </Section>
      ) : null}

      <DashboardWeather weather={weather} hasStops={stops.length > 0} onPlanB={onPlanB} />

      <Section title="Étapes du Voyage">
        {stops.length === 0 ? (
          <View style={styles.emptyStopCard}>
            <AppText variant="bodySmall" color="muted">Choisissez une ville : le pays et l’heure locale sont retrouvés automatiquement.</AppText>
            <Button fullWidth onPress={onOpenCreateStop} icon={<Icon name="plus" size={16} color={colors.white} />}>
              Ajouter une Étape
            </Button>
          </View>
        ) : stops.map((stop, index) => (
          <Pressable
            key={stop.id}
            accessibilityRole="button"
            onPress={() => onOpenStop(stop)}
            style={({ pressed }) => [styles.timelineCard, pressed && styles.pressed]}
          >
            <View style={styles.timelineRail}>
              <AppText variant="caption">{`0${index + 1}`.slice(-2)}</AppText>
              <View style={styles.timelineDot} />
              {index < stops.length - 1 ? <View style={styles.timelineLine} /> : null}
            </View>
            <View style={styles.timelineBody}>
              <AppText variant="label">{stop.name}</AppText>
              <AppText variant="caption" color="muted">
                {formatStopSummary(stop)}
              </AppText>
              <StepWeatherPreview weather={weatherByStopId?.[stop.id]} />
            </View>
          </Pressable>
        ))}
        {stops.length > 0 ? (
          <Button fullWidth variant="secondary" onPress={onOpenCreateStop} icon={<Icon name="plus" size={16} color={colors.fg} />}>
            Ajouter une Étape
          </Button>
        ) : null}
      </Section>

      <Section title="Réservations">
        {reservations.length === 0 ? (
          <Pressable onPress={onOpenReservations} style={({ pressed }) => [styles.bookingCard, pressed && styles.pressed]}>
            <View style={styles.bookingIcon}><Icon name="calendar" size={20} color={colors.gold} /></View>
            <View style={styles.flexOne}>
              <AppText variant="label">Aucune Réservation confirmée</AppText>
              <AppText variant="caption" color="muted">Importer puis confirmer un Document de voyage</AppText>
            </View>
            <Icon name="arrow-right" size={16} color={colors.fg} />
          </Pressable>
        ) : reservations.slice(0, 2).map((reservation) => (
          <Pressable key={reservation.id} onPress={onOpenReservations} style={({ pressed }) => [styles.bookingCard, pressed && styles.pressed]}>
            <View style={styles.bookingIcon}><Icon name="calendar" size={20} color={colors.gold} /></View>
            <View style={styles.flexOne}>
              <AppText variant="label">{reservation.title}</AppText>
              <AppText variant="caption" color="muted">{reservation.provider ?? "Réservation confirmée"}</AppText>
            </View>
            <Badge label="Confirmée" variant="success" />
          </Pressable>
        ))}
        <View style={styles.linkRow}>
          <TextLink label="Toutes les Réservations" onPress={onOpenReservations} />
          <TextLink label="Documents" onPress={onOpenDocuments} />
        </View>
      </Section>

    </View>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? <AppText variant="sectionTitle" color="muted" style={styles.sectionTitle}>{title}</AppText> : null}
      {children}
    </View>
  );
}

function SummaryCard({ icon, label, value, detail, progress, onPress }: { icon: "wallet" | "calendar" | "check"; label: string; value: string; detail: string; progress?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label} : ${value} ${detail}`} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
      <View style={styles.summaryHeader}>
        <Icon name={icon} size={16} color={colors.accentStrong} />
        <AppText variant="caption" color="muted" numberOfLines={1}>{label}</AppText>
      </View>
      <AppText variant="h3" numberOfLines={1} adjustsFontSizeToFit>{value}</AppText>
      <AppText variant="caption" color="muted" numberOfLines={1}>{detail}</AppText>
      {progress !== undefined ? (
        <View style={styles.summaryTrack}>
          <View style={[styles.summaryFill, { width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }, progress > 1 && styles.summaryOver]} />
        </View>
      ) : null}
    </Pressable>
  );
}

function TodaySection({ today, rainExpected, onPlanB, travelToNextSeconds, onOpenDirections, onComposeDay, onOpenItinerary }: {
  today: TodayPlan;
  rainExpected: boolean;
  onPlanB?: () => void;
  travelToNextSeconds: number | null;
  onOpenDirections?: (entry: TodayEntry) => void;
  onComposeDay: () => void;
  onOpenItinerary: () => void;
}) {
  const next = today.next;
  return (
    <Section title={`Aujourd’hui · jour ${today.dayNumber} sur ${today.dayCount}`}>
      {rainExpected && onPlanB ? (
        <Pressable accessibilityRole="button" onPress={onPlanB} style={({ pressed }) => [styles.bookingCard, pressed && styles.pressed]}>
          <View style={styles.bookingIcon}><AppText variant="h3">☔</AppText></View>
          <View style={styles.flexOne}>
            <AppText variant="label">Pluie prévue aujourd’hui</AppText>
            <AppText variant="caption" color="muted">Composer un plan B avec des lieux couverts</AppText>
          </View>
          <Icon name="arrow-right" size={16} color={colors.fg} />
        </Pressable>
      ) : null}
      {next ? (
        <View style={styles.nextCard}>
          <AppText variant="badge" color="onAccent">{`À ${next.time}`}</AppText>
          <AppText variant="h3" color="onAccent" numberOfLines={2}>{next.item.title}</AppText>
          {next.item.place?.address ? <AppText variant="caption" color="onAccent" numberOfLines={1}>{next.item.place.address}</AppText> : null}
          {next.item.place?.coordinates && onOpenDirections ? (
            <Pressable accessibilityRole="button" onPress={() => onOpenDirections(next)} style={({ pressed }) => [styles.nextAction, pressed && styles.pressed]}>
              <Icon name="map-pin" size={16} color={colors.tealStrong} />
              <AppText variant="label" color="teal">
                {travelToNextSeconds != null ? `Y aller · ${formatDuration(travelToNextSeconds)} à pied` : "Y aller"}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {today.entries.length === 0 ? (
        <Pressable accessibilityRole="button" onPress={onComposeDay} style={({ pressed }) => [styles.bookingCard, pressed && styles.pressed]}>
          <View style={styles.bookingIcon}><Icon name="sparkles" size={20} color={colors.gold} /></View>
          <View style={styles.flexOne}>
            <AppText variant="label">Rien de prévu aujourd’hui</AppText>
            <AppText variant="caption" color="muted">{`Composer la journée${today.stop ? ` à ${today.stop.name}` : ""} avec l’IA`}</AppText>
          </View>
          <Icon name="arrow-right" size={16} color={colors.fg} />
        </Pressable>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel="Voir le programme du jour sur la carte" onPress={onOpenItinerary} style={({ pressed }) => [styles.todayList, pressed && styles.pressed]}>
          {today.entries.map((entry) => (
            <View key={entry.item.id} style={styles.todayRow}>
              <AppText variant="label" color={entry.status === "next" ? "accent" : "muted"} style={styles.todayTime}>{entry.time ?? "—"}</AppText>
              <AppText variant="bodySmall" color={entry.status === "done" ? "muted" : "fg"} style={[styles.flexOne, entry.status === "done" && styles.todayDone]} numberOfLines={1}>{entry.item.title}</AppText>
            </View>
          ))}
          {today.reservations.map((reservation) => (
            <View key={reservation.id} style={styles.todayRow}>
              <AppText variant="label" color="muted" style={styles.todayTime}>{reservation.start?.local.slice(11, 16) ?? "—"}</AppText>
              <AppText variant="bodySmall" style={styles.flexOne} numberOfLines={1}>{reservation.title}</AppText>
              <Badge label="Réservé" variant="gold" />
            </View>
          ))}
        </Pressable>
      )}
    </Section>
  );
}

function RoundAction({ label, icon, disabled, onPress }: { label: string; icon: ReactNode; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} style={({ pressed }) => [styles.roundAction, disabled && styles.futureContent, pressed && styles.pressed]}>
      {icon}
    </Pressable>
  );
}

function Meta({ icon, label }: { icon: "calendar" | "users"; label: string }) {
  return <View style={styles.metaItem}><Icon name={icon} size={14} color={colors.white} /><AppText variant="caption" color="onAccent">{label}</AppText></View>;
}

function DismissibleBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View style={styles.memberBanner}>
      <View style={styles.bannerIcon}><Icon name="users" size={16} color={colors.white} /></View>
      <AppText variant="label" color="teal" style={styles.flexOne}>{message}</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onDismiss} style={({ pressed }) => [styles.dismissButton, pressed && styles.pressed]}><Icon name="close" size={16} /></Pressable>
    </View>
  );
}

function TextLink({ label, onPress, icon = "arrow-right" }: { label: string; onPress: () => void; icon?: "arrow-right" | "map" | "wallet" }) {
  return <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.textLink, pressed && styles.pressed]}><Icon name={icon} size={16} color={colors.teal} /><AppText variant="caption" color="teal">{label}</AppText></Pressable>;
}

function ActionPill({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.actionPill, shadows.accent, pressed && styles.pressed]}><AppText variant="label" color="onAccent">{label}</AppText></Pressable>;
}

function DashboardLoadingState() {
  return <View style={styles.loadingScreen}><Skeleton height={spacing.xl * 7 - spacing.xs} borderRadius={0} /><View style={styles.loadingContent}><Skeleton width="45%" height={spacing.lg} /><Skeleton height={spacing["2xl"]} /><Skeleton height={spacing["2xl"] * 2} /><Skeleton height={spacing["2xl"] * 3} /></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingBottom: spacing["2xl"] * 3 },
  hero: { height: spacing.xl * 7 - spacing.xs, overflow: "hidden", position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  heroControls: { position: "absolute", left: spacing.md, right: spacing.md, flexDirection: "row", justifyContent: "space-between", zIndex: zIndex.sticky },
  roundAction: { width: spacing["2xl"] - spacing.xs, height: spacing["2xl"] - spacing.xs, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  futureIconWrap: { position: "relative" },
  futureDot: { position: "absolute", top: -spacing.xs / 2, right: -spacing.xs / 2, width: spacing.sm + spacing.xs / 2, height: spacing.sm + spacing.xs / 2, borderRadius: radius.full, backgroundColor: colors.gold, borderWidth: spacing.xs / 2, borderColor: colors.white },
  heroContent: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: spacing.xs },
  heroMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  familyPresence: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  memberAvatar: { width: spacing.xl, height: spacing.xl, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealSoft },
  tabs: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  tab: { minHeight: spacing["2xl"] - spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: componentMetrics.tripDashboard.outlinedBorderWidth, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  tabActive: { backgroundColor: colors.fg, borderColor: colors.fg },
  futureTab: { borderStyle: "dashed" },
  bannerWrap: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  memberBanner: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tealSoft, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.teal, flexDirection: "row", alignItems: "center", gap: spacing.md },
  bannerIcon: { width: spacing.xl, height: spacing.xl, borderRadius: radius.full, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  dismissButton: { width: spacing["2xl"] - spacing.xs, height: spacing["2xl"] - spacing.xs, alignItems: "center", justifyContent: "center" },
  alertStack: { gap: spacing.sm },
  futureAlert: { marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.goldSoft, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.gold, flexDirection: "row", alignItems: "center", gap: spacing.md },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { textTransform: "uppercase", marginBottom: spacing.md },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  questionIcon: { backgroundColor: colors.tealSoft },
  planBChip: { marginTop: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.tealSoft },
  climateCard: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, backgroundColor: colors.surface },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  summaryTrack: { height: 4, borderRadius: radius.full, backgroundColor: colors.border, overflow: "hidden", marginTop: spacing.xs },
  summaryFill: { height: "100%", borderRadius: radius.full, backgroundColor: colors.teal },
  summaryOver: { backgroundColor: colors.accentStrong },
  nextCard: { gap: spacing.xs, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.tealStrong, marginBottom: spacing.sm },
  nextAction: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.white },
  todayList: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, backgroundColor: colors.surface },
  todayRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  todayTime: { width: spacing["2xl"] + spacing.xs },
  todayDone: { textDecorationLine: "line-through" },
  quickAction: { width: "31.5%", flexGrow: 1, minHeight: spacing["2xl"] * 2, padding: spacing.md, borderRadius: radius.md, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, backgroundColor: colors.surface, gap: spacing.xs },
  miniFutureBadge: { position: "absolute", top: spacing.xs, right: spacing.xs, transform: [{ scale: 0.7 }] },
  timelineCard: { flexDirection: "row", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, borderRadius: radius.md, marginBottom: spacing.sm },
  emptyStopCard: { gap: spacing.md },
  preparationCard: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.md, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, backgroundColor: colors.surface },
  preparationHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm },
  preparationBar: { flexDirection: "row", gap: spacing.xs },
  preparationSegment: { flex: 1, height: spacing.xs + spacing.xs / 2, borderRadius: radius.full, backgroundColor: colors.border },
  preparationSegmentDone: { backgroundColor: colors.tealStrong },
  preparationStep: { minHeight: layout.minimumTouchTarget, flexDirection: "row", alignItems: "center", gap: spacing.md - spacing.xs },
  preparationCheck: { width: spacing.lg - spacing.xs / 2, height: spacing.lg - spacing.xs / 2, borderRadius: radius.full, borderWidth: 2, borderColor: colors.accentStrong, alignItems: "center", justifyContent: "center" },
  preparationCheckDone: { borderWidth: 0, backgroundColor: colors.tealStrong },
  todayPanel: { paddingTop: spacing.lg },
  aiDayCard: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.tealStrong },
  aiDayIcon: { width: 44, height: 44, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  aiDayAction: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.md, paddingHorizontal: spacing.md, minHeight: 40, borderRadius: radius.full, backgroundColor: colors.white },
  weatherNote: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: -spacing.md, marginBottom: spacing.xl },
  timelineRail: { minWidth: spacing["2xl"], alignItems: "center" },
  timelineDot: { width: spacing.sm + spacing.xs / 2, height: spacing.sm + spacing.xs / 2, borderRadius: radius.full, backgroundColor: colors.teal, marginVertical: spacing.sm - spacing.xs / 2 },
  timelineLine: { width: spacing.xs / 2, flex: 1, minHeight: spacing.md, backgroundColor: colors.border, borderRadius: radius.full },
  timelineBody: { flex: 1, gap: spacing.xs },
  weatherStrip: { flexDirection: "row", gap: spacing.sm },
  weatherDay: { flex: 1, minWidth: spacing["2xl"] + spacing.sm, padding: spacing.sm, borderRadius: radius.sm, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", gap: spacing.xs },
  stepWeatherStrip: { gap: spacing.xs, paddingTop: spacing.xs },
  stepWeatherDay: { minWidth: spacing["2xl"] * 2, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.tealSoft, gap: spacing.xs },
  bookingCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, borderRadius: radius.md, marginBottom: spacing.sm },
  bookingIcon: { width: spacing["2xl"] - spacing.sm, height: spacing["2xl"] - spacing.sm, borderRadius: radius.sm, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  linkRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.sm },
  activityItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, borderRadius: radius.md },
  activityAvatar: { width: spacing.xl + spacing.xs, height: spacing.xl + spacing.xs, borderRadius: radius.full, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  mapPreview: { height: spacing.xl * 10, borderRadius: radius.md, backgroundColor: colors.tealSoft, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, overflow: "hidden", marginBottom: spacing.md },
  mapUnavailable: { minHeight: spacing.xl * 10, borderRadius: radius.md, backgroundColor: colors.tealSoft, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, justifyContent: "center", marginBottom: spacing.md, padding: spacing.md },
  mapDataNotice: { marginBottom: spacing.md },
  addressList: { gap: spacing.sm },
  addressCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, borderRadius: radius.md },
  addressIcon: { width: spacing["2xl"] - spacing.sm, height: spacing["2xl"] - spacing.sm, borderRadius: radius.sm, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  budgetCard: { padding: spacing.lg, backgroundColor: colors.surface, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, borderRadius: radius.md, gap: spacing.sm, marginBottom: spacing.md },
  textLink: { minHeight: spacing["2xl"] - spacing.xs, flexDirection: "row", alignItems: "center", gap: spacing.sm - spacing.xs / 2, alignSelf: "flex-start" },
  actionPill: { minHeight: spacing["2xl"], paddingHorizontal: spacing.lg, borderRadius: radius.full, backgroundColor: colors.accentStrong, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  comingSoonFrame: { position: "relative" },
  comingSoonInset: { marginBottom: spacing.sm },
  comingSoonBadge: { position: "absolute", top: spacing.xs, right: spacing.lg, zIndex: zIndex.sticky },
  futureContent: { opacity: componentMetrics.tripDashboard.comingSoonOpacity },
  flexOne: { flex: 1 },
  pressed: { transform: [{ scale: 0.97 }] },
  centeredState: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  loadingScreen: { flex: 1, backgroundColor: colors.bg },
  loadingContent: { padding: spacing.lg, gap: spacing.md },
});

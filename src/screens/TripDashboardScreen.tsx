import { useMemo, useState, type ReactNode } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop as GradientStop } from "react-native-svg";
import { ExpoMapsView } from "../adapters/map/expo-maps-view";
import type { ItineraryItem, Reservation, Stop, Trip } from "../modules/_shared/model";
import {
  colors,
  componentMetrics,
  layout,
  radius,
  shadows,
  spacing,
  zIndex,
} from "../theme";
import { AppText, Badge, Icon, InlineMessage, Skeleton } from "../ui";
import {
  countTripDays,
  formatStopDates,
  formatTripDateRange,
  buildDashboardMapPresentation,
  getTravelerCount,
  sortStopsByLocalDate,
} from "./trip-dashboard-model";

type DashboardTab = "today" | "map" | "photos" | "addresses" | "budget";

export interface TripDashboardScreenProps {
  trip: Trip | null;
  stops: Stop[];
  itineraryItems: ItineraryItem[];
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onOpenSettings: () => void;
  onOpenAssistant: () => void;
  onOpenItinerary: () => void;
  onOpenStop: (stop: Stop) => void;
  onOpenExpenses: () => void;
  onOpenReservations: () => void;
  onOpenDocuments: () => void;
}

const tabs: readonly { key: DashboardTab; label: string; future?: boolean }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "map", label: "Carte" },
  { key: "photos", label: "Photos", future: true },
  { key: "addresses", label: "Adresses" },
  { key: "budget", label: "Budget" },
];

export function TripDashboardScreen(props: TripDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<DashboardTab>("today");
  const [refreshing, setRefreshing] = useState(false);
  const [showMemberNotice, setShowMemberNotice] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const sortedStops = useMemo(() => sortStopsByLocalDate(props.stops), [props.stops]);
  const topControlsStyle = useMemo(
    () => ({ paddingTop: Math.max(insets.top, spacing.md) }),
    [insets.top],
  );
  const navStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, spacing.sm) }),
    [insets.bottom],
  );
  const fabStyle = useMemo(
    () => ({ bottom: Math.max(insets.bottom, spacing.sm) + spacing["2xl"] + spacing.lg }),
    [insets.bottom],
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
          <Image
            source={require("../../assets/trip-lisbon-cover.png")}
            resizeMode="cover"
            style={styles.heroImage}
            accessibilityLabel="Vue aérienne de Lisbonne"
          />
          <Svg style={styles.heroOverlay} width="100%" height="100%">
            <Defs>
              <LinearGradient id="dashboard-overlay" x1="0" y1="0" x2="0" y2="1">
                <GradientStop offset="0.35" stopColor={colors.transparent} />
                <GradientStop offset="1" stopColor={colors.fg} stopOpacity={0.78} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#dashboard-overlay)" />
          </Svg>

          <View style={[styles.heroControls, topControlsStyle]}>
            <View style={styles.futureIconWrap}>
              <RoundAction
                label="Chat — à venir"
                disabled
                icon={<Icon name="message-circle" size={20} />}
                onPress={() => undefined}
              />
              <View style={styles.futureDot} />
            </View>
            <RoundAction
              label="Actualiser"
              icon={<Icon name="refresh" size={20} />}
              onPress={() => void refresh()}
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

        <ComingSoonFrame label="Présence en ligne">
          <View style={styles.familyPresence}>
            {trip.members.slice(0, 4).map((member, index) => (
              <View key={member.accountId} style={styles.memberAvatar}>
                <AppText variant="badge" color={index % 2 === 0 ? "teal" : "accent"}>
                  {`C${index + 1}`}
                </AppText>
              </View>
            ))}
            <AppText variant="caption" color="muted">
              {trip.members.length} Membre{trip.members.length > 1 ? "s" : ""} du voyage
            </AppText>
          </View>
        </ComingSoonFrame>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              disabled={tab.future}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab.key, disabled: tab.future }}
              accessibilityLabel={tab.future ? `${tab.label}, à venir` : tab.label}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [
                styles.tab,
                activeTab === tab.key && styles.tabActive,
                tab.future && styles.futureTab,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                variant="label"
                color={activeTab === tab.key ? "onAccent" : "muted"}
              >
                {tab.label}
              </AppText>
              {tab.future ? <Badge label="À venir" variant="gold" /> : null}
            </Pressable>
          ))}
        </ScrollView>

        {props.error ? (
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

        <ComingSoonFrame label="Météo en direct" inset>
          <View style={styles.alertStack}>
            <FutureAlert icon="☀️" message="Alerte UV et recommandations météo" />
            <FutureAlert icon="🌧" message="Prévisions de pluie pendant le Voyage" />
          </View>
        </ComingSoonFrame>

        {activeTab === "today" ? (
          <TodayPanel
            stops={sortedStops}
            tripDays={tripDays}
            reservations={props.reservations}
            onOpenAssistant={props.onOpenAssistant}
            onOpenItinerary={props.onOpenItinerary}
            onOpenStop={props.onOpenStop}
            onOpenReservations={props.onOpenReservations}
            onOpenDocuments={props.onOpenDocuments}
          />
        ) : null}
        {activeTab === "map" ? (
          <MapPanel
            stops={sortedStops}
            itineraryItems={props.itineraryItems}
            onOpen={props.onOpenItinerary}
          />
        ) : null}
        {activeTab === "addresses" ? (
          <AddressesPanel onOpenAssistant={props.onOpenAssistant} />
        ) : null}
        {activeTab === "budget" ? (
          <BudgetPanel currency={trip.referenceCurrency} onOpen={props.onOpenExpenses} />
        ) : null}
      </ScrollView>

      <View style={[styles.fabContainer, fabStyle]} pointerEvents="box-none">
        {fabOpen ? (
          <View style={styles.fabMenu}>
            <FabItem label="Photo" icon="📷" future onPress={() => undefined} />
            <FabItem label="Lieu" icon="📍" onPress={props.onOpenAssistant} />
            <FabItem label="Note" icon="📝" future onPress={() => undefined} />
            <FabItem label="Dépense" icon="€" onPress={props.onOpenExpenses} />
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fabOpen ? "Fermer les ajouts rapides" : "Ouvrir les ajouts rapides"}
          onPress={() => setFabOpen((current) => !current)}
          style={({ pressed }) => [styles.fab, shadows.lg, pressed && styles.pressed]}
        >
          <Icon name={fabOpen ? "close" : "plus"} size={24} color={colors.white} />
        </Pressable>
      </View>

      <View style={[styles.bottomNav, navStyle]}>
        <NavItem active label="Accueil" icon="home" onPress={() => setActiveTab("today")} />
        <NavItem label="Explorer" icon="search" onPress={props.onOpenAssistant} />
        <NavItem label="Photos" icon="image" future onPress={() => undefined} />
        <NavItem label="Journal" icon="file-text" future onPress={() => undefined} />
        <NavItem label="Réglages" icon="settings" onPress={props.onOpenSettings} />
      </View>
    </View>
  );
}

function TodayPanel({
  stops,
  tripDays,
  reservations,
  onOpenAssistant,
  onOpenItinerary,
  onOpenStop,
  onOpenReservations,
  onOpenDocuments,
}: {
  stops: Stop[];
  tripDays: number | null;
  reservations: Reservation[];
  onOpenAssistant: () => void;
  onOpenItinerary: () => void;
  onOpenStop: (stop: Stop) => void;
  onOpenReservations: () => void;
  onOpenDocuments: () => void;
}) {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(stops[0]?.id ?? null);
  const effectiveSelectedStopId = selectedStopId ?? stops[0]?.id ?? null;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySwitcher}>
        {stops.length > 0 ? stops.map((stop, index) => (
          <Pressable
            key={stop.id}
            accessibilityRole="button"
            accessibilityState={{ selected: effectiveSelectedStopId === stop.id }}
            onPress={() => setSelectedStopId(stop.id)}
            style={({ pressed }) => [
              styles.dayPill,
              effectiveSelectedStopId === stop.id && styles.dayPillActive,
              pressed && styles.pressed,
            ]}
          >
            <AppText variant="caption" color={effectiveSelectedStopId === stop.id ? "accent" : "muted"}>
              {`Étape ${index + 1}`}
            </AppText>
          </Pressable>
        )) : (
          <View style={styles.dayPill}><AppText variant="caption" color="muted">Aucune Étape</AppText></View>
        )}
      </ScrollView>

      <Section>
        <View style={styles.quickActions}>
          <QuickAction icon="layers" label="Explorer IA" onPress={onOpenAssistant} />
          <QuickAction icon="image" label="Photos" future onPress={() => undefined} />
          <QuickAction icon="file-text" label="Journal" future onPress={() => undefined} />
          <QuickAction icon="map-pin" label="Lieux" onPress={onOpenItinerary} />
        </View>
      </Section>

      <Section title="Progression du Voyage">
        <Pressable
          accessibilityRole="button"
          onPress={onOpenItinerary}
          style={({ pressed }) => [styles.progressCard, pressed && styles.pressed]}
        >
          <View style={styles.progressRing}>
            <Svg width="100%" height="100%" viewBox="0 0 72 72">
              <Circle cx="36" cy="36" r="30" fill="none" stroke={colors.border} strokeWidth="6" />
              <Circle cx="36" cy="36" r="30" fill="none" stroke={colors.accent} strokeWidth="6" strokeLinecap="round" strokeDasharray="188.5" strokeDashoffset="94.25" transform="rotate(-90 36 36)" />
            </Svg>
            <View style={styles.ringLabel}>
              <AppText variant="label">{stops.length}</AppText>
              <AppText variant="badge" color="muted">Étapes</AppText>
            </View>
          </View>
          <View style={styles.progressInfo}>
            <AppText variant="label">Votre Voyage se prépare</AppText>
            <AppText variant="caption" color="muted">
              {tripDays ? `${tripDays} jours planifiés. ` : ""}{"Consultez l'itinéraire confirmé."}
            </AppText>
            <View style={styles.inlineLink}>
              <Icon name="arrow-right" size={14} color={colors.accent} />
              <AppText variant="caption" color="accent">{"Ouvrir l'itinéraire"}</AppText>
            </View>
          </View>
        </Pressable>
      </Section>

      <Section title="Étapes du Voyage">
        {stops.length === 0 ? (
          <InlineMessage title="Aucune Étape" message="Ajoutez une Étape pour structurer le Voyage." />
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
                {formatStopDates(stop)} · {stop.timeZone}
              </AppText>
              <Badge label="Étape" variant="teal" />
            </View>
          </Pressable>
        ))}
      </Section>

      <ComingSoonFrame label="Météo">
        <Section title="Météo — Semaine">
          <View style={styles.weatherStrip}>
            {["Lun", "Mar", "Mer", "Jeu", "Ven"].map((day, index) => (
              <View key={day} style={styles.weatherDay}>
                <AppText variant="badge" color="muted">{day}</AppText>
                <AppText variant="h3">{index === 3 ? "🌧" : "☀️"}</AppText>
                <AppText variant="label">—°</AppText>
              </View>
            ))}
          </View>
        </Section>
      </ComingSoonFrame>

      <ComingSoonFrame label="Location intégrée">
        <Section title="Location voiture">
          <View style={styles.bookingCard}>
            <View style={styles.bookingIcon}><AppText variant="h3">🚗</AppText></View>
            <View style={styles.flexOne}>
              <AppText variant="label">Location de voiture</AppText>
              <AppText variant="caption" color="muted">Comparateur et réservation intégrée</AppText>
            </View>
          </View>
        </Section>
      </ComingSoonFrame>

      <Section title="Réservations à venir">
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

      <ComingSoonFrame label="Fil social">
        <Section title="Activité famille">
          <View style={styles.activityItem}>
            <View style={styles.activityAvatar}><AppText variant="badge" color="teal">NV</AppText></View>
            <View style={styles.flexOne}>
              <AppText variant="label">{"L'activité collaborative apparaîtra ici"}</AppText>
              <AppText variant="caption" color="muted">Photos, votes et journal après la V0</AppText>
            </View>
          </View>
        </Section>
      </ComingSoonFrame>
    </View>
  );
}

function MapPanel({
  stops,
  itineraryItems,
  onOpen,
}: {
  stops: Stop[];
  itineraryItems: ItineraryItem[];
  onOpen: () => void;
}) {
  const presentation = buildDashboardMapPresentation(stops, itineraryItems);

  return (
    <Section title="Carte du séjour">
      {presentation.model.points.length > 0 ? (
        <ExpoMapsView
          model={presentation.model}
          style={styles.mapPreview}
          testID="dashboard-map-preview"
        />
      ) : (
        <View style={styles.mapUnavailable} testID="dashboard-map-unavailable">
          <InlineMessage
            title={stops.length === 0 ? "Aucune Étape" : "Aucun lieu géolocalisé"}
            message={
              stops.length === 0
                ? "Ajoutez une Étape pour afficher les lieux du Voyage."
                : "Les lieux confirmés sans coordonnées restent visibles dans l’itinéraire."
            }
          />
        </View>
      )}
      {presentation.unlocatedPlaceCount > 0 ? (
        <View style={styles.mapDataNotice} testID="dashboard-map-partial-data">
          <AppText variant="caption" color="muted">
            {presentation.unlocatedPlaceCount} lieu
            {presentation.unlocatedPlaceCount > 1 ? "x" : ""} confirmé
            {presentation.unlocatedPlaceCount > 1 ? "s" : ""} sans coordonnées · liste conservée
          </AppText>
        </View>
      ) : null}
      <TextLink label="Ouvrir la carte complète de l'itinéraire" onPress={onOpen} icon="map" />
    </Section>
  );
}

function AddressesPanel({ onOpenAssistant }: { onOpenAssistant: () => void }) {
  return (
    <Section title="Adresses sauvegardées">
      <InlineMessage title="Aucune adresse disponible ici" message="Les lieux confirmés sont consultables depuis l'itinéraire et les Suggestions IA." />
      <ActionPill label="Découvrir des lieux" onPress={onOpenAssistant} />
    </Section>
  );
}

function BudgetPanel({ currency, onOpen }: { currency: string; onOpen: () => void }) {
  return (
    <Section title="Budget du séjour">
      <View style={styles.budgetCard}>
        <AppText variant="h2">— {currency}</AppText>
        <AppText variant="caption" color="muted">Budget global et Dépenses réelles du Voyage</AppText>
        <View style={styles.budgetTrack}><View style={styles.budgetFillEmpty} /></View>
      </View>
      <TextLink label="Voir le détail du budget" onPress={onOpen} icon="wallet" />
    </Section>
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

function QuickAction({ icon, label, future, onPress }: { icon: "layers" | "image" | "file-text" | "map-pin"; label: string; future?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={future} onPress={onPress} accessibilityRole="button" accessibilityLabel={future ? `${label}, à venir` : label} accessibilityState={{ disabled: future }} style={({ pressed }) => [styles.quickAction, future && styles.futureContent, pressed && styles.pressed]}>
      {future ? <Badge label="À venir" variant="gold" style={styles.miniFutureBadge} /> : null}
      <Icon name={icon} size={22} color={colors.accent} />
      <AppText variant="caption" align="center">{label}</AppText>
    </Pressable>
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

function FutureAlert({ icon, message }: { icon: string; message: string }) {
  return <View style={styles.futureAlert}><View style={styles.bannerIcon}><AppText variant="label" color="onAccent">{icon}</AppText></View><AppText variant="label" color="gold" style={styles.flexOne}>{message}</AppText></View>;
}

function ComingSoonFrame({ label, inset = false, children }: { label: string; inset?: boolean; children: ReactNode }) {
  return (
    <View accessibilityLabel={`${label}, à venir`} accessibilityState={{ disabled: true }} style={[styles.comingSoonFrame, inset && styles.comingSoonInset]}>
      <View pointerEvents="none" style={styles.futureContent}>{children}</View>
      <Badge label="À venir" variant="gold" style={styles.comingSoonBadge} />
    </View>
  );
}

function FabItem({ label, icon, future, onPress }: { label: string; icon: string; future?: boolean; onPress: () => void }) {
  return <View style={styles.fabItem}><View style={styles.fabLabel}><AppText variant="caption">{label}{future ? " · À venir" : ""}</AppText></View><Pressable disabled={future} accessibilityRole="button" accessibilityLabel={future ? `${label}, à venir` : label} onPress={onPress} style={({ pressed }) => [styles.fabItemButton, future && styles.futureContent, pressed && styles.pressed]}><AppText variant="label" color={future ? "gold" : "accent"}>{icon}</AppText></Pressable></View>;
}

function NavItem({ active, label, icon, future, onPress }: { active?: boolean; label: string; icon: "home" | "search" | "image" | "file-text" | "settings"; future?: boolean; onPress: () => void }) {
  const color = active ? colors.accent : future ? colors.border : colors.muted;
  return <Pressable disabled={future} onPress={onPress} accessibilityRole="button" accessibilityLabel={future ? `${label}, à venir` : label} style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}><Icon name={icon} size={24} color={color} /><AppText variant="badge" color={active ? "accent" : "muted"}>{label}</AppText>{future ? <View style={styles.navFutureDot} /> : null}</Pressable>;
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
  daySwitcher: { gap: spacing.sm - spacing.xs / 2, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  dayPill: { minHeight: spacing["2xl"] - spacing.xs, paddingHorizontal: spacing.md - spacing.xs / 2, borderRadius: radius.full, borderWidth: componentMetrics.tripDashboard.outlinedBorderWidth, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  dayPillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { textTransform: "uppercase", marginBottom: spacing.md },
  quickActions: { flexDirection: "row", gap: spacing.sm },
  quickAction: { flex: 1, minHeight: spacing["2xl"] * 2, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: spacing.sm - spacing.xs / 2, position: "relative" },
  miniFutureBadge: { position: "absolute", top: spacing.xs, right: spacing.xs, transform: [{ scale: 0.7 }] },
  progressCard: { flexDirection: "row", alignItems: "center", gap: spacing.lg, padding: spacing.lg, borderRadius: radius.md, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, backgroundColor: colors.surface },
  progressRing: { width: spacing.lg * 3, height: spacing.lg * 3, position: "relative" },
  ringLabel: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  progressInfo: { flex: 1, gap: spacing.xs },
  inlineLink: { flexDirection: "row", alignItems: "center", gap: spacing.sm - spacing.xs / 2, marginTop: spacing.xs },
  timelineCard: { flexDirection: "row", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, borderRadius: radius.md, marginBottom: spacing.sm },
  timelineRail: { minWidth: spacing["2xl"], alignItems: "center" },
  timelineDot: { width: spacing.sm + spacing.xs / 2, height: spacing.sm + spacing.xs / 2, borderRadius: radius.full, backgroundColor: colors.teal, marginVertical: spacing.sm - spacing.xs / 2 },
  timelineLine: { width: spacing.xs / 2, flex: 1, minHeight: spacing.md, backgroundColor: colors.border, borderRadius: radius.full },
  timelineBody: { flex: 1, gap: spacing.xs },
  weatherStrip: { flexDirection: "row", gap: spacing.sm },
  weatherDay: { flex: 1, minWidth: spacing["2xl"] + spacing.sm, padding: spacing.sm, borderRadius: radius.sm, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", gap: spacing.xs },
  bookingCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, borderRadius: radius.md, marginBottom: spacing.sm },
  bookingIcon: { width: spacing["2xl"] - spacing.sm, height: spacing["2xl"] - spacing.sm, borderRadius: radius.sm, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  linkRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.sm },
  activityItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, borderRadius: radius.md },
  activityAvatar: { width: spacing.xl + spacing.xs, height: spacing.xl + spacing.xs, borderRadius: radius.full, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  mapPreview: { height: spacing.xl * 10, borderRadius: radius.md, backgroundColor: colors.tealSoft, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, overflow: "hidden", marginBottom: spacing.md },
  mapUnavailable: { minHeight: spacing.xl * 10, borderRadius: radius.md, backgroundColor: colors.tealSoft, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, justifyContent: "center", marginBottom: spacing.md, padding: spacing.md },
  mapDataNotice: { marginBottom: spacing.md },
  budgetCard: { padding: spacing.lg, backgroundColor: colors.surface, borderWidth: componentMetrics.tripDashboard.thinBorderWidth, borderColor: colors.border, borderRadius: radius.md, gap: spacing.xs, marginBottom: spacing.md },
  budgetTrack: { height: spacing.sm, borderRadius: radius.full, backgroundColor: colors.border, overflow: "hidden", marginTop: spacing.md },
  budgetFillEmpty: { width: "0%", height: "100%", backgroundColor: colors.teal },
  textLink: { minHeight: spacing["2xl"] - spacing.xs, flexDirection: "row", alignItems: "center", gap: spacing.sm - spacing.xs / 2, alignSelf: "flex-start" },
  actionPill: { minHeight: spacing["2xl"], paddingHorizontal: spacing.lg, borderRadius: radius.full, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  comingSoonFrame: { position: "relative" },
  comingSoonInset: { marginBottom: spacing.sm },
  comingSoonBadge: { position: "absolute", top: spacing.xs, right: spacing.lg, zIndex: zIndex.sticky },
  futureContent: { opacity: componentMetrics.tripDashboard.comingSoonOpacity },
  fabContainer: { position: "absolute", right: spacing.lg, alignItems: "flex-end", zIndex: zIndex.modal },
  fabMenu: { gap: spacing.sm, marginBottom: spacing.sm },
  fabItem: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: spacing.sm },
  fabLabel: { paddingHorizontal: spacing.md - spacing.xs, paddingVertical: spacing.sm - spacing.xs / 2, borderRadius: radius.full, backgroundColor: colors.surface, ...shadows.md },
  fabItemButton: { width: spacing["2xl"] - spacing.xs, height: spacing["2xl"] - spacing.xs, borderRadius: radius.full, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center", ...shadows.md },
  fab: { width: spacing["2xl"] + spacing.sm, height: spacing["2xl"] + spacing.sm, borderRadius: radius.full, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  bottomNav: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "space-around", backgroundColor: colors.surface, borderTopWidth: componentMetrics.tripDashboard.thinBorderWidth, borderTopColor: colors.border, paddingTop: spacing.sm, zIndex: zIndex.sticky },
  navItem: { flex: 1, minHeight: spacing["2xl"], alignItems: "center", justifyContent: "center", gap: spacing.xs, position: "relative" },
  navFutureDot: { position: "absolute", top: 0, right: spacing.md, width: spacing.sm, height: spacing.sm, borderRadius: radius.full, backgroundColor: colors.gold },
  flexOne: { flex: 1 },
  pressed: { transform: [{ scale: 0.97 }] },
  centeredState: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  loadingScreen: { flex: 1, backgroundColor: colors.bg },
  loadingContent: { padding: spacing.lg, gap: spacing.md },
});

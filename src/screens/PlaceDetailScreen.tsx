import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop as GradientStop } from "react-native-svg";
import type { Coordinates, PlaceCandidate } from "../modules/_shared/model";
import { ExpoMapsView } from "../adapters/map/expo-maps-view";
import type { MapModel } from "../adapters/map";
import {
  colors,
  componentMetrics,
  layout,
  radius,
  shadows,
  spacing,
  zIndex,
} from "../theme";
import {
  AppText,
  Badge,
  BottomSheet,
  Button,
  Icon,
  InlineMessage,
  SectionTitle,
  Skeleton,
  Toast,
  type ToastData,
} from "../ui";
import {
  formatCountry,
  formatPlaceCategory,
  formatPlaceSource,
  type PlaceScheduleDate,
} from "./place-detail-model";
import { placeAttribution } from "../modules/places";

export interface PlaceDetailScreenProps {
  place: PlaceCandidate | null;
  scheduleDates: PlaceScheduleDate[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  onBack: () => void;
  onRetry: () => Promise<void>;
  onOpenMap: () => void;
  onOpenDirections: () => void;
  onOpenWaze?: () => void;
  onOpenPhotoCredit?: () => void;
  onAddToItinerary: (selection: PlaceScheduleDate) => Promise<void>;
}

export interface PlaceMapPresentation {
  model: MapModel | null;
  coordinateLabel: string | null;
}

export function buildPlaceMapPresentation(
  place: Pick<PlaceCandidate, "id" | "name" | "coordinates">,
): PlaceMapPresentation {
  const coordinates = isValidCoordinates(place.coordinates)
    ? place.coordinates
    : null;

  if (coordinates === null) {
    return { model: null, coordinateLabel: null };
  }

  return {
    model: {
      points: [
        {
          id: place.id,
          label: place.name,
          coordinates,
        },
      ],
    },
    coordinateLabel: formatCoordinates(coordinates),
  };
}

function isValidCoordinates(
  value: Coordinates | null | undefined,
): value is Coordinates {
  return (
    value != null &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180
  );
}

function formatCoordinates(coordinates: Coordinates): string {
  return `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`;
}

export function PlaceDetailScreen(props: PlaceDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<PlaceScheduleDate | null>(
    props.scheduleDates[0] ?? null,
  );
  const [toast, setToast] = useState<ToastData | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const photoSources = getPhotoSources(props.place?.imageUrl, props.place?.category);
  const heroNavStyle = useMemo(
    () => ({ paddingTop: Math.max(insets.top, spacing.md) }),
    [insets.top],
  );
  const footerStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, spacing.lg) }),
    [insets.bottom],
  );

  if (props.loading && !props.place) return <PlaceDetailLoading />;
  if (!props.place) {
    return (
      <View style={styles.centeredState}>
        <InlineMessage
          variant={props.error ? "error" : "info"}
          title={props.error ? "Lieu indisponible" : "Lieu introuvable"}
          message={props.error ?? "Ce candidat n'est plus disponible."}
        />
        {props.error ? (
          <Button onPress={() => void props.onRetry()}>Réessayer</Button>
        ) : null}
        <Button variant="secondary" onPress={props.onBack}>Retour</Button>
      </View>
    );
  }

  const place = props.place;
  const mapPresentation = buildPlaceMapPresentation(place);
  const category = formatPlaceCategory(place.category);
  const country = formatCountry(place.countryCode);
  const summary = [category, place.distanceMeters != null ? `à ${formatDistance(place.distanceMeters)}` : null]
    .filter(Boolean)
    .join(" · ");
  // Pulling down past the top stretches the photo instead of revealing an empty band.
  const heroStretch = {
    transform: [
      { translateY: scrollY.interpolate({ inputRange: [-HERO_HEIGHT, 0], outputRange: [-HERO_HEIGHT / 2, 0], extrapolateRight: "clamp" }) },
      { scale: scrollY.interpolate({ inputRange: [-HERO_HEIGHT, 0], outputRange: [2, 1], extrapolateRight: "clamp" }) },
    ],
  };
  const selected =
    selectedDate ?? props.scheduleDates[0] ?? null;

  async function confirmAdd() {
    if (!selected) return;
    try {
      await props.onAddToItinerary(selected);
      setPickerVisible(false);
      setToast({
        id: `place-added-${selected.date}`,
        title: "Ajouté à l'itinéraire",
        message: selected.label,
        variant: "success",
      });
    } catch {
      // The route exposes the Module error through the typed error state.
    }
  }

  return (
    <View style={styles.screen} testID="place-detail-screen">
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        <View style={styles.hero}>
          <Animated.View style={[styles.heroMedia, heroStretch]}>
            <Image
              source={photoSources[0]}
              resizeMode="cover"
              style={styles.heroImage}
              accessibilityLabel="Photo illustrative du lieu"
            />
          </Animated.View>
          <Svg style={styles.heroOverlay} width="100%" height="100%">
            <Defs>
              <LinearGradient id="place-overlay" x1="0" y1="0" x2="0" y2="1">
                <GradientStop offset="0.4" stopColor={colors.fg} stopOpacity={0} />
                <GradientStop offset="1" stopColor={colors.fg} stopOpacity={0.62} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#place-overlay)" />
          </Svg>
          <View style={[styles.heroNav, heroNavStyle]}>
            <CircleAction
              label="Retour"
              icon={<Icon name="arrow-left" size={20} />}
              onPress={props.onBack}
            />
            <View style={styles.heroActions}>
              <FutureCircleAction
                label="Partager"
                icon={<Icon name="arrow-right" size={20} />}
              />
              <FutureCircleAction
                label="Sauvegarder"
                icon={<Icon name="plus" size={20} />}
              />
            </View>
          </View>
        </View>

        {place.imageCredit ? (
          <Pressable
            accessibilityRole="link"
            onPress={props.onOpenPhotoCredit}
            disabled={!props.onOpenPhotoCredit}
            style={styles.photoCredit}
          >
            <AppText variant="caption" color="muted">
              Photo par {place.imageCredit.photographer} · Unsplash
            </AppText>
          </Pressable>
        ) : null}

        <View style={styles.infoWrap}>
          <View style={[styles.infoCard, shadows.lg]}>
            <View style={styles.titleRow}>
              <AppText variant="h2" style={styles.title}>{place.name}</AppText>
              <FutureValue label="★ —" />
            </View>
            {summary ? <AppText variant="bodySmall" color="muted">{summary}</AppText> : null}
            {place.address ? <Meta icon="map-pin" label={place.address} /> : null}
            <View style={styles.tags}>
              {category ? <Badge label={category} variant="accent" /> : null}
              {place.provider === "geoapify" ? <Badge label={formatPlaceSource(place.provider)} variant="teal" /> : null}
            </View>
            <ComingSoonFrame label="Description fournisseur">
              <AppText variant="bodySmall" color="muted">
                {"La description détaillée du lieu apparaîtra ici lorsqu'elle sera fournie par une source vérifiée."}
              </AppText>
            </ComingSoonFrame>
            <ComingSoonFrame label="Conseil IA">
              <View style={styles.aiInsight}>
                <Icon name="layers" size={20} color={colors.teal} />
                <AppText variant="bodySmall" color="teal" style={styles.flexOne}>
                  Le conseil personnalisé restera une Suggestion IA à confirmer.
                </AppText>
              </View>
            </ComingSoonFrame>
          </View>
        </View>

        <ComingSoonFrame label="Accessibilité du lieu">
          <View style={styles.accessRow}>
            <AccessPill icon="♿" label="Accès PMR" />
            <AccessPill icon="👶" label="Poussette" />
            <AccessPill icon="P" label="Parking" />
          </View>
        </ComingSoonFrame>

        <ComingSoonFrame label="Photos fournisseur">
          <Section title="Photos">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
              {photoSources.map((source, index) => (
                <Image
                  key={index}
                  source={source}
                  resizeMode="cover"
                  style={styles.photoThumb}
                  accessibilityLabel="Photo de référence à venir"
                />
              ))}
            </ScrollView>
          </Section>
        </ComingSoonFrame>

        <Section title="Localisation">
          {mapPresentation.model ? (
            <ExpoMapsView
              model={mapPresentation.model}
              selectedPointId={place.id}
              style={styles.mapPreview}
              testID="place-map-preview"
            />
          ) : (
            <View style={styles.mapUnavailable} testID="place-map-unavailable">
              <InlineMessage
                title="Carte indisponible"
                message="Ce lieu ne possède pas de coordonnées vérifiées."
              />
            </View>
          )}
          <LinkAction
            icon="map"
            label="Ouvrir dans la carte"
            onPress={props.onOpenMap}
            disabled={mapPresentation.model === null}
          />
        </Section>

        <ComingSoonFrame label="Horaires détaillés">
          <Section title="Horaires détaillés">
            <View style={styles.infoRow}>
              <Icon name="clock" size={20} color={colors.muted} />
              <View style={styles.flexOne}>
                <AppText variant="caption" color="muted">{"Aujourd'hui"}</AppText>
                <AppText variant="label">Horaires non fournis</AppText>
              </View>
              <Icon name="chevron-down" size={20} color={colors.muted} />
            </View>
          </Section>
        </ComingSoonFrame>

        <ComingSoonFrame label="Menu et spécialités">
          <Section title="Menu / Spécialités">
            {["Spécialité du lieu", "Formule", "À emporter"].map((label) => (
              <View key={label} style={styles.menuItem}>
                <View style={styles.flexOne}>
                  <AppText variant="label">{label}</AppText>
                  <AppText variant="caption" color="muted">Informations vérifiées à venir</AppText>
                </View>
                <AppText variant="label" color="accent">—</AppText>
              </View>
            ))}
          </Section>
        </ComingSoonFrame>

        <ComingSoonFrame label="Conseils des membres">
          <Section title="Conseil famille">
            <View style={styles.tipCard}>
              <AppText variant="h3" color="gold">💡</AppText>
              <AppText variant="bodySmall" color="muted" style={styles.flexOne}>
                Les conseils sociaux des Membres du voyage ne font pas partie de la V0.
              </AppText>
            </View>
          </Section>
        </ComingSoonFrame>

        <ComingSoonFrame label="Vote famille">
          <Section title="Vote famille">
            <View style={styles.voteCard}>
              <AppText variant="label" align="center">On y va ?</AppText>
              <View style={styles.voteButtons}>
                <VoteButton icon="👍" label="Oui" />
                <VoteButton icon="🤷" label="Bof" />
                <VoteButton icon="👎" label="Non" />
              </View>
            </View>
          </Section>
        </ComingSoonFrame>

        <Section title="Infos pratiques">
          {place.address ? (
            <InfoRow icon="map-pin" label="Adresse" value={place.address} />
          ) : null}
          {country ? (
            <InfoRow icon="map" label="Pays" value={country} />
          ) : null}
          {!place.address && !place.countryCode ? (
            <InlineMessage title="Informations limitées" message="Le fournisseur n'a transmis ni adresse ni pays." />
          ) : null}
        </Section>

        <Section title="S'y rendre">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: mapPresentation.model === null }}
            disabled={mapPresentation.model === null}
            onPress={props.onOpenDirections}
            style={({ pressed }) => [
              styles.transportOption,
              mapPresentation.model === null && styles.disabledAction,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.transportIcon}><Icon name="map-pin" size={20} color={colors.teal} /></View>
            <View style={styles.flexOne}>
              <AppText variant="label">Itinéraire dans Plans</AppText>
              <AppText variant="caption" color="muted">Navigation vers les coordonnées vérifiées</AppText>
            </View>
            <Icon name="arrow-right" size={16} color={colors.muted} />
          </Pressable>
          {props.onOpenWaze ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: mapPresentation.model === null }}
              disabled={mapPresentation.model === null}
              onPress={props.onOpenWaze}
              style={({ pressed }) => [styles.transportOption, mapPresentation.model === null && styles.disabledAction, pressed && styles.pressed]}
            >
              <View style={styles.transportIcon}><Icon name="map-pin" size={20} color={colors.accent} /></View>
              <View style={styles.flexOne}>
                <AppText variant="label">Itinéraire dans Waze</AppText>
                <AppText variant="caption" color="muted">Ouvrir la navigation avec les coordonnées vérifiées</AppText>
              </View>
              <Icon name="arrow-right" size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </Section>

        <ComingSoonFrame label="Lieux similaires">
          <Section title="Lieux similaires">
            <View style={styles.similarRow}>
              {[0, 1].map((index) => (
                <View key={index} style={styles.similarCard}>
                  <View style={styles.similarThumb} />
                  <AppText variant="label">Candidat vérifié</AppText>
                  <AppText variant="caption" color="muted">À venir</AppText>
                </View>
              ))}
            </View>
          </Section>
        </ComingSoonFrame>

        <ComingSoonFrame label="Avis des membres">
          <Section title="Avis de la famille">
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAvatar}><AppText variant="badge" color="teal">NV</AppText></View>
                <AppText variant="label">Avis à venir</AppText>
              </View>
              <AppText variant="bodySmall" color="muted">{"Aucun avis inventé n'est affiché."}</AppText>
            </View>
          </Section>
        </ComingSoonFrame>

        <View style={styles.sourceFooter}>
          <AppText variant="caption" color="muted">
            {[
              formatPlaceSource(place.provider),
              mapPresentation.coordinateLabel,
              placeAttribution(place.provider, place.attribution),
            ].filter(Boolean).join(" · ")}
          </AppText>
        </View>
      </Animated.ScrollView>

      <View style={[styles.footer, footerStyle]}>
        <Button
          fullWidth
          style={styles.footerPrimary}
          disabled={props.scheduleDates.length === 0}
          onPress={() => setPickerVisible(true)}
          icon={<Icon name="plus" size={20} color={colors.white} />}
        >
          Ajouter au programme
        </Button>
      </View>

      <BottomSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title="Ajouter à quel jour ?"
      >
        {props.scheduleDates.length === 0 ? (
          <InlineMessage title="Aucune date disponible" message="Ajoutez d'abord une Étape au Voyage." />
        ) : (
          <View style={styles.dateGrid}>
            {props.scheduleDates.map((option) => (
              <Pressable
                key={`${option.stopId}-${option.date}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected?.stopId === option.stopId && selected.date === option.date }}
                onPress={() => setSelectedDate(option)}
                style={({ pressed }) => [
                  styles.dateOption,
                  selected?.stopId === option.stopId && selected.date === option.date && styles.dateOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <AppText variant="caption" color={selected?.stopId === option.stopId && selected.date === option.date ? "accent" : "fg"} align="center">
                  {option.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        )}
        {props.error ? <InlineMessage variant="error" title="Ajout impossible" message={props.error} /> : null}
        <Button fullWidth loading={props.saving} disabled={!selected} onPress={() => void confirmAdd()}>Confirmer</Button>
        <Button fullWidth variant="secondary" onPress={() => setPickerVisible(false)}>Annuler</Button>
      </BottomSheet>

      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
    </View>
  );
}

function getPhotoSources(imageUrl?: string, category?: string) {
  // The restaurant illustration would be misleading for a museum or a park.
  const fallback = /catering|restaurant/.test(category ?? "")
    ? require("../../assets/restaurant-detail.png")
    : require("../../assets/photo-album-2.png");
  return [
    imageUrl ? { uri: imageUrl } : fallback,
    require("../../assets/photo-album-3.png"),
    require("../../assets/photo-album-2.png"),
  ] as const;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><SectionTitle title={title} />{children}</View>;
}

function ComingSoonFrame({ label, children }: { label: string; children: ReactNode }) {
  void label;
  void children;
  return null;
}

function CircleAction({ label, icon, onPress }: { label: string; icon: ReactNode; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.circleAction, pressed && styles.pressed]}>{icon}</Pressable>;
}

function FutureCircleAction({ label, icon }: { label: string; icon: ReactNode }) {
  void label;
  void icon;
  return null;
}

function FutureValue({ label }: { label: string }) {
  void label;
  return null;
}

function Meta({ icon, label }: { icon: "map-pin"; label: string }) {
  return <View style={styles.metaItem}><Icon name={icon} size={14} color={colors.muted} /><AppText variant="caption" color="muted" style={styles.flexOne}>{label}</AppText></View>;
}

function AccessPill({ icon, label }: { icon: string; label: string }) {
  return <View style={styles.accessPill}><AppText variant="label">{icon}</AppText><AppText variant="caption" color="muted">{label}</AppText></View>;
}

function InfoRow({ icon, label, value }: { icon: "map-pin" | "map"; label: string; value: string }) {
  return <View style={styles.infoRow}><Icon name={icon} size={20} color={colors.muted} /><View style={styles.flexOne}><AppText variant="caption" color="muted">{label}</AppText><AppText variant="label">{value}</AppText></View></View>;
}

function VoteButton({ icon, label }: { icon: string; label: string }) {
  return <View style={styles.voteButton}><AppText variant="h3">{icon}</AppText><AppText variant="caption" color="muted">{label}</AppText></View>;
}

function LinkAction({ icon, label, onPress, disabled = false }: { icon: "map"; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="link" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.linkAction, disabled && styles.disabledAction, pressed && styles.pressed]}><Icon name={icon} size={16} color={disabled ? colors.muted : colors.teal} /><AppText variant="caption" color={disabled ? "muted" : "teal"}>{label}</AppText></Pressable>;
}

function formatDistance(value: number): string {
  return value >= 1_000 ? `${(value / 1_000).toFixed(1)} km` : `${Math.round(value)} m`;
}

function PlaceDetailLoading() {
  return <View style={styles.loadingScreen}><Skeleton height={HERO_HEIGHT} borderRadius={0} /><View style={styles.loadingBody}><Skeleton width="65%" height={spacing.xl} /><Skeleton height={spacing["2xl"] * 2} /><Skeleton height={spacing["2xl"] * 3} /></View></View>;
}

const HERO_HEIGHT = spacing.xl * 8 + spacing.xs;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingBottom: spacing["2xl"] * 3 },
  hero: { height: HERO_HEIGHT, position: "relative" },
  heroMedia: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  heroImage: { width: "100%", height: "100%" },
  sourceFooter: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  heroOverlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  heroNav: { position: "absolute", left: spacing.md, right: spacing.md, flexDirection: "row", justifyContent: "space-between", zIndex: zIndex.sticky },
  heroActions: { flexDirection: "row", gap: spacing.sm },
  circleAction: { width: spacing["2xl"] - spacing.xs, height: spacing["2xl"] - spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  futureCircleWrap: { position: "relative" },
  actionFutureDot: { position: "absolute", top: -spacing.xs / 2, right: -spacing.xs / 2, width: spacing.sm, height: spacing.sm, borderRadius: radius.full, backgroundColor: colors.gold },
  photoFutureBadge: { position: "absolute", top: spacing["2xl"] + spacing.lg, right: spacing.md },
  closingBadge: { position: "absolute", bottom: spacing.md, left: spacing.md },
  infoWrap: { padding: spacing.lg, marginTop: -spacing.xl, position: "relative" },
  infoCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  title: { flex: 1 },
  futureValue: { alignItems: "flex-end", gap: spacing.xs },
  metaItem: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs, maxWidth: "100%" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  aiInsight: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.tealSoft, borderRadius: radius.sm },
  accessRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  accessPill: { flexDirection: "row", alignItems: "center", gap: spacing.sm - spacing.xs / 2, borderRadius: radius.full, borderWidth: componentMetrics.placeDetail.thinBorderWidth, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md - spacing.xs / 2, paddingVertical: spacing.sm },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  photoStrip: { gap: spacing.sm, paddingBottom: spacing.sm },
  photoThumb: { width: spacing.xl * 4 + spacing.md - spacing.xs, height: spacing.xl * 3 + spacing.xs, borderRadius: radius.sm },
  photoCredit: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  mapPreview: { height: spacing.xl * 4 + spacing.md - spacing.xs, borderRadius: radius.md, overflow: "hidden", marginBottom: spacing.sm },
  mapUnavailable: { minHeight: spacing.xl * 4 + spacing.md - spacing.xs, justifyContent: "center", marginBottom: spacing.sm },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: componentMetrics.placeDetail.thinBorderWidth, borderColor: colors.border, borderRadius: radius.sm, marginBottom: spacing.sm },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: componentMetrics.placeDetail.thinBorderWidth, borderColor: colors.border, borderRadius: radius.sm, marginBottom: spacing.sm },
  tipCard: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md, backgroundColor: colors.goldSoft, borderWidth: componentMetrics.placeDetail.thinBorderWidth, borderColor: colors.gold, borderRadius: radius.md },
  voteCard: { backgroundColor: colors.surface, borderWidth: componentMetrics.placeDetail.thinBorderWidth, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  voteButtons: { flexDirection: "row", justifyContent: "center", gap: spacing.md },
  voteButton: { minWidth: spacing.lg * 3, minHeight: spacing["2xl"], padding: spacing.md - spacing.xs, borderRadius: radius.md, borderWidth: componentMetrics.placeDetail.outlinedBorderWidth, borderColor: colors.border, backgroundColor: colors.bg, alignItems: "center", gap: spacing.xs },
  transportOption: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: componentMetrics.placeDetail.thinBorderWidth, borderColor: colors.border, borderRadius: radius.sm },
  transportIcon: { width: spacing.xl + spacing.xs, height: spacing.xl + spacing.xs, borderRadius: radius.sm, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  similarRow: { flexDirection: "row", gap: spacing.md },
  similarCard: { width: spacing.xl * 5 - spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderWidth: componentMetrics.placeDetail.thinBorderWidth, borderColor: colors.border, borderRadius: radius.md, gap: spacing.xs },
  similarThumb: { width: "100%", height: spacing.xl * 2 + spacing.md, borderRadius: radius.sm, backgroundColor: colors.border, marginBottom: spacing.xs },
  reviewCard: { padding: spacing.md, backgroundColor: colors.surface, borderWidth: componentMetrics.placeDetail.thinBorderWidth, borderColor: colors.border, borderRadius: radius.md, gap: spacing.sm },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reviewAvatar: { width: spacing.xl, height: spacing.xl, borderRadius: radius.full, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  linkAction: { minHeight: spacing["2xl"] - spacing.xs, flexDirection: "row", alignItems: "center", gap: spacing.sm - spacing.xs / 2, alignSelf: "flex-start" },
  disabledAction: { opacity: 0.6 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: layout.maxMobileWidth, alignSelf: "center", flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: componentMetrics.placeDetail.thinBorderWidth, borderTopColor: colors.border, zIndex: zIndex.sticky },
  footerPrimary: { flex: 1 },
  futureReserve: { position: "relative" },
  reserveBadge: { position: "absolute", top: -spacing.sm, right: -spacing.sm, transform: [{ scale: 0.72 }] },
  dateGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dateOption: { width: "48%", minHeight: spacing["2xl"], padding: spacing.sm, borderRadius: radius.sm, borderWidth: componentMetrics.placeDetail.outlinedBorderWidth, borderColor: colors.border, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  dateOptionSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  futureFrame: { position: "relative" },
  futureContent: { opacity: componentMetrics.placeDetail.comingSoonOpacity },
  futureBadge: { position: "absolute", top: spacing.xs, right: spacing.lg, zIndex: zIndex.sticky },
  flexOne: { flex: 1 },
  pressed: { transform: [{ scale: 0.97 }] },
  centeredState: { flex: 1, justifyContent: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.bg },
  loadingScreen: { flex: 1, backgroundColor: colors.bg },
  loadingBody: { padding: spacing.lg, gap: spacing.md },
});

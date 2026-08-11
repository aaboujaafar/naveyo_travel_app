import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop as GradientStop } from "react-native-svg";
import { colors, layout, radius, shadows, spacing } from "../theme";
import {
  AppText,
  Badge,
  Button,
  Icon,
  SectionTitle,
  Switch,
} from "../ui";
import type { IconName } from "../ui";

export interface OnboardingScreenProps {
  onCreateAccount: () => void;
  onExistingAccount: () => void;
  onComplete: () => void;
}

interface CarouselSlide {
  title: string;
  description: string;
  tint: "accent" | "teal" | "gold";
  future?: boolean;
}

const slides: readonly CarouselSlide[] = [
  {
    title: "Voyages et Étapes réunis",
    description: "Dates locales, fuseaux et itinéraire restent organisés dans un espace privé.",
    tint: "accent",
  },
  {
    title: "Documents utiles, même hors ligne",
    description: "Téléchargez le paquet du Voyage avant de partir et gardez les informations essentielles.",
    tint: "teal",
  },
  {
    title: "Photos, Journal et récap social",
    description: "Un aperçu du carnet enrichi prévu après l’alpha privée.",
    tint: "gold",
    future: true,
  },
];

const carouselIntervalMs = 4_000;

export function OnboardingScreen({
  onCreateAccount,
  onExistingAccount,
  onComplete,
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const carouselRef = useRef<ScrollView>(null);
  const isDragging = useRef(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const screenWidth = Math.min(window.width, layout.maxMobileWidth);
  const slideWidth = screenWidth - spacing.lg * 2;
  const heroHeightStyle = useMemo(
    () => ({ height: Math.max(window.height * 0.55, spacing["2xl"] * 6) }),
    [window.height],
  );
  const logoInsetStyle = useMemo(
    () => ({ top: Math.max(insets.top, spacing.lg) }),
    [insets.top],
  );
  const actionsInsetStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, spacing.xl) }),
    [insets.bottom],
  );
  const slideWidthStyle = useMemo(() => ({ width: slideWidth }), [slideWidth]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isDragging.current) return;
      setActiveSlide((current) => {
        const next = (current + 1) % slides.length;
        carouselRef.current?.scrollTo({ x: next * slideWidth, animated: true });
        return next;
      });
    }, carouselIntervalMs);
    return () => clearInterval(timer);
  }, [slideWidth]);

  function selectSlide(index: number) {
    setActiveSlide(index);
    carouselRef.current?.scrollTo({ x: index * slideWidth, animated: true });
  }

  function finish(next: () => void) {
    onComplete();
    next();
  }

  return (
    <View style={styles.screen} testID="onboarding-screen">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, heroHeightStyle]}>
          <Image
            source={require("../../assets/onboarding-hero.png")}
            resizeMode="cover"
            style={styles.heroImage}
            accessibilityLabel="Voyageurs au bord de la mer"
          />
          <Svg style={styles.heroOverlay} width="100%" height="100%">
            <Defs>
              <LinearGradient id="onboarding-overlay" x1="0" y1="0" x2="0" y2="1">
                <GradientStop offset="0.32" stopColor={colors.transparent} />
                <GradientStop offset="1" stopColor={colors.fg} stopOpacity={0.82} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#onboarding-overlay)" />
          </Svg>
          <View style={[styles.logo, logoInsetStyle]}>
            <View style={styles.logoMark}><Icon name="map" size={20} color={colors.white} /></View>
            <AppText variant="h3" color="onAccent">Naveyo</AppText>
          </View>
          <View style={styles.heroContent}>
            <AppText variant="displayHero" color="onAccent">Votre Voyage, réuni au même endroit</AppText>
            <AppText variant="body" color="onAccent">
              Préparez à deux vos Étapes, itinéraires, Réservations et Documents de voyage.
            </AppText>
          </View>
        </View>

        <View style={styles.body}>
          <View>
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              snapToInterval={slideWidth}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onScrollBeginDrag={() => { isDragging.current = true; }}
              onScrollEndDrag={() => { isDragging.current = false; }}
              onMomentumScrollEnd={(event) => {
                const next = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
                setActiveSlide(Math.min(Math.max(next, 0), slides.length - 1));
              }}
              accessibilityLabel="Aperçu des fonctions de Naveyo"
            >
              {slides.map((slide, index) => (
                <View key={slide.title} style={[styles.carouselSlide, slideWidthStyle]}>
                  <Image
                    source={require("../../assets/onboarding-hero.png")}
                    resizeMode="cover"
                    style={styles.carouselImage}
                    accessibilityLabel={slide.title}
                  />
                  <View style={[styles.slideTint, styles[`slideTint_${slide.tint}`]]} />
                  <Svg style={styles.slideOverlay} width="100%" height="100%">
                    <Defs>
                      <LinearGradient id={`slide-overlay-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <GradientStop offset="0.3" stopColor={colors.transparent} />
                        <GradientStop offset="1" stopColor={colors.fg} stopOpacity={0.86} />
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill={`url(#slide-overlay-${index})`} />
                  </Svg>
                  <View style={styles.slideCaption}>
                    {slide.future ? <Badge label="À venir" variant="gold" /> : null}
                    <AppText variant="h3" color="onAccent">{slide.title}</AppText>
                    <AppText variant="caption" color="onAccent">{slide.description}</AppText>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.dots} accessibilityRole="tablist">
              {slides.map((slide, index) => (
                <Pressable
                  key={slide.title}
                  accessibilityRole="tab"
                  accessibilityLabel={`Aperçu ${index + 1} sur ${slides.length}`}
                  accessibilityState={{ selected: activeSlide === index }}
                  onPress={() => selectSlide(index)}
                  style={[styles.dot, activeSlide === index && styles.dotActive]}
                />
              ))}
            </View>
          </View>

          <ComingSoon label="Compteur et témoignages">
            <View style={styles.socialProof}>
              <View style={styles.avatarStack}>
                <View style={[styles.miniAvatar, styles.avatarAccent]}><AppText variant="badge" color="onAccent">N</AppText></View>
                <View style={[styles.miniAvatar, styles.avatarTeal]}><AppText variant="badge" color="onAccent">V</AppText></View>
                <View style={[styles.miniAvatar, styles.avatarGold]}><AppText variant="badge" color="onAccent">+</AppText></View>
              </View>
              <View style={styles.flexOne}>
                <AppText variant="label">Communauté Naveyo</AppText>
                <AppText variant="caption" color="muted">Compteur public et témoignages après l’alpha privée</AppText>
              </View>
            </View>
          </ComingSoon>

          <View style={styles.features}>
            <Feature
              icon="users"
              tone="accent"
              title="Voyage privé à deux"
              description="Deux Comptes préparent ensemble un Voyage avec les rôles propriétaire et éditeur."
            />
            <Feature
              icon="sparkles"
              tone="teal"
              title="Suggestions IA contrôlées"
              description="Découvrez de vrais candidats de lieux autour de chaque Étape, puis confirmez vos choix."
            />
            <ComingSoon label="Photos, Journal et récap social">
              <Feature
                icon="image"
                tone="gold"
                title="Récap prêt à partager"
                description="Photos, Journal, stories et export social sont prévus après la V0."
              />
            </ComingSoon>
            <Feature
              icon="file-text"
              tone="muted"
              title="Consultation hors ligne"
              description="Téléchargez le paquet du Voyage pour retrouver Étapes, itinéraire, Réservations et Documents utiles."
              footer={<View style={styles.offlineStatus}><AppText variant="caption" color="muted" style={styles.flexOne}>Paquet du Voyage</AppText><Badge label="À télécharger" variant="teal" /></View>}
            />
          </View>

          <View style={styles.stepsSection}>
            <SectionTitle title="Comment ça marche" />
            <View style={styles.stepsRow}>
              <Step number="1" tone="accent" title="Créez" description="Votre Compte puis votre Voyage" />
              <View style={styles.stepConnector} />
              <Step number="2" tone="teal" title="Invitez" description="Le second Compte rejoint le Voyage" />
              <View style={styles.stepConnector} />
              <Step number="3" tone="gold" title="Préparez" description="Étapes, lieux et Documents utiles" />
            </View>
          </View>

          <ComingSoon label="Témoignages publics">
            <View style={styles.testimonials}>
              <SectionTitle title="Ils voyagent avec Naveyo" />
              <View style={styles.testimonialCard}>
                <AppText variant="h2" color="accent">“</AppText>
                <AppText variant="bodySmall" color="muted">Les témoignages publics seront ajoutés après les validations de l’alpha privée.</AppText>
                <View style={styles.testimonialFooter}><View style={styles.testimonialAvatar} /><View style={styles.flexOne}><SkeletonLine /><SkeletonLine short /></View></View>
              </View>
            </View>
          </ComingSoon>

          <View>
            <SectionTitle title="Autorisations · aperçu" />
            <View style={styles.permissions}>
              <PermissionRow icon="image" tone="accent" title="Photos et fichiers" detail="Demandée seulement pour importer un Document" enabled />
              <PermissionRow icon="map-pin" tone="teal" title="Localisation" detail="Consentement explicite au démarrage de la Trace" enabled />
              <PermissionRow icon="message-circle" tone="gold" title="Notifications" detail="Non nécessaires à la V0" future />
            </View>
          </View>

          <ComingSoon label="Stores publics et Android">
            <View>
              <SectionTitle title="Bientôt disponible" />
              <View style={styles.storeBadges}>
                <StoreBadge icon="home" title="App Store public" />
                <StoreBadge icon="map" title="Google Play" />
              </View>
            </View>
          </ComingSoon>
        </View>

        <View style={[styles.actions, actionsInsetStyle]}>
          <Button fullWidth onPress={() => finish(onCreateAccount)}>Créer mon premier Voyage</Button>
          <Button fullWidth variant="ghost" onPress={() => finish(onExistingAccount)}>J’ai déjà un Compte</Button>
        </View>
      </ScrollView>
    </View>
  );
}

function Feature({
  icon,
  tone,
  title,
  description,
  footer,
}: {
  icon: IconName;
  tone: "accent" | "teal" | "gold" | "muted";
  title: string;
  description: string;
  footer?: React.ReactNode;
}) {
  return (
    <View style={styles.featureCard}>
      <View style={[styles.featureIcon, styles[`featureIcon_${tone}`]]}><Icon name={icon} size={22} color={toneColor(tone)} /></View>
      <View style={styles.featureText}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="bodySmall" color="muted">{description}</AppText>
        {footer}
      </View>
    </View>
  );
}

function Step({ number, tone, title, description }: { number: string; tone: "accent" | "teal" | "gold"; title: string; description: string }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepCircle, styles[`stepCircle_${tone}`]]}><AppText variant="h3" color="onAccent">{number}</AppText></View>
      <AppText variant="label" align="center">{title}</AppText>
      <AppText variant="caption" color="muted" align="center">{description}</AppText>
    </View>
  );
}

function PermissionRow({ icon, tone, title, detail, enabled, future }: { icon: IconName; tone: "accent" | "teal" | "gold"; title: string; detail: string; enabled?: boolean; future?: boolean }) {
  return (
    <View style={styles.permissionRow}>
      <View style={[styles.permissionIcon, styles[`featureIcon_${tone}`]]}><Icon name={icon} size={20} color={toneColor(tone)} /></View>
      <View style={styles.flexOne}><AppText variant="label">{title}</AppText><AppText variant="caption" color="muted">{detail}</AppText></View>
      {future ? <Badge label="À venir" variant="gold" /> : <Switch value={enabled === true} label={`${title}, aperçu informatif`} onChange={() => undefined} disabled />}
    </View>
  );
}

function StoreBadge({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View accessibilityLabel={`${title}, à venir`} accessibilityState={{ disabled: true }} style={styles.storeBadge}>
      <Icon name={icon} size={22} color={colors.white} />
      <View><AppText variant="badge" color="onAccent">Disponible sur</AppText><AppText variant="label" color="onAccent">{title}</AppText></View>
    </View>
  );
}

function ComingSoon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View accessible accessibilityLabel={`${label}, à venir`} accessibilityState={{ disabled: true }} style={styles.futureWrap}>
      <View pointerEvents="none" style={styles.futureContent}>{children}</View>
      <Badge label="À venir" variant="gold" style={styles.futureBadge} />
    </View>
  );
}

function SkeletonLine({ short }: { short?: boolean }) {
  return <View style={[styles.skeletonLine, short && styles.skeletonLineShort]} />;
}

function toneColor(tone: "accent" | "teal" | "gold" | "muted"): string {
  return tone === "accent" ? colors.accent : tone === "teal" ? colors.teal : tone === "gold" ? colors.gold : colors.muted;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center" },
  hero: { position: "relative", minHeight: spacing["2xl"] * 6, overflow: "hidden" },
  heroImage: { ...StyleSheet.absoluteFill, width: "100%", height: "120%" },
  heroOverlay: { ...StyleSheet.absoluteFill },
  logo: { position: "absolute", left: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logoMark: { width: spacing.xl, height: spacing.xl, borderRadius: radius.full, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.white },
  heroContent: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.xl, gap: spacing.sm },
  body: { padding: spacing.lg, gap: spacing.lg },
  carouselSlide: { height: spacing["2xl"] * 4 + spacing.lg, position: "relative", overflow: "hidden", borderRadius: radius.md },
  carouselImage: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  slideTint: { ...StyleSheet.absoluteFill, opacity: 0.16 },
  slideTint_accent: { backgroundColor: colors.accent },
  slideTint_teal: { backgroundColor: colors.teal },
  slideTint_gold: { backgroundColor: colors.gold },
  slideOverlay: { ...StyleSheet.absoluteFill },
  slideCaption: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, gap: spacing.xs },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, marginTop: spacing.md },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: radius.full, backgroundColor: colors.border },
  dotActive: { width: spacing.lg, backgroundColor: colors.accent },
  socialProof: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  avatarStack: { flexDirection: "row", alignItems: "center" },
  miniAvatar: { width: spacing.xl, height: spacing.xl, marginLeft: -spacing.sm, borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.surface, alignItems: "center", justifyContent: "center" },
  avatarAccent: { backgroundColor: colors.accent, marginLeft: 0 },
  avatarTeal: { backgroundColor: colors.teal },
  avatarGold: { backgroundColor: colors.gold },
  features: { gap: spacing.md },
  featureCard: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  featureIcon: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  featureIcon_accent: { backgroundColor: colors.accentSoft },
  featureIcon_teal: { backgroundColor: colors.tealSoft },
  featureIcon_gold: { backgroundColor: colors.goldSoft },
  featureIcon_muted: { backgroundColor: colors.bg },
  featureText: { flex: 1, gap: spacing.xs },
  offlineStatus: { minHeight: layout.minimumTouchTarget, flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.bg },
  stepsSection: { paddingVertical: spacing.lg },
  stepsRow: { flexDirection: "row", alignItems: "flex-start" },
  step: { flex: 1, alignItems: "center", gap: spacing.sm },
  stepCircle: { width: spacing["2xl"] - spacing.sm, height: spacing["2xl"] - spacing.sm, borderRadius: radius.full, alignItems: "center", justifyContent: "center", ...shadows.sm },
  stepCircle_accent: { backgroundColor: colors.accent },
  stepCircle_teal: { backgroundColor: colors.teal },
  stepCircle_gold: { backgroundColor: colors.gold },
  stepConnector: { flex: 0.4, height: StyleSheet.hairlineWidth, marginTop: spacing.md + spacing.xs, backgroundColor: colors.border },
  testimonials: { gap: spacing.md },
  testimonialCard: { padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  testimonialFooter: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  testimonialAvatar: { width: spacing.xl, height: spacing.xl, borderRadius: radius.full, backgroundColor: colors.border },
  skeletonLine: { width: "70%", height: spacing.sm, marginBottom: spacing.xs, borderRadius: radius.full, backgroundColor: colors.border },
  skeletonLineShort: { width: "44%" },
  permissions: { overflow: "hidden", borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  permissionRow: { minHeight: spacing["2xl"] + spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  permissionIcon: { width: spacing.xl + spacing.xs, height: spacing.xl + spacing.xs, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  storeBadges: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  storeBadge: { flex: 1, minHeight: spacing["2xl"], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.fg },
  futureWrap: { position: "relative" },
  futureContent: { opacity: 0.48 },
  futureBadge: { position: "absolute", top: spacing.xs, right: spacing.xs },
  actions: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  flexOne: { flex: 1 },
});

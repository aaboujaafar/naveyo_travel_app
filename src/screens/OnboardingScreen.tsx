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
                <GradientStop offset="0.32" stopColor={colors.fg} stopOpacity={0} />
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
                        <GradientStop offset="0.3" stopColor={colors.fg} stopOpacity={0} />
                        <GradientStop offset="1" stopColor={colors.fg} stopOpacity={0.86} />
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill={`url(#slide-overlay-${index})`} />
                  </Svg>
                  <View style={styles.slideCaption}>
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
  stepCircle_accent: { backgroundColor: colors.accentStrong },
  stepCircle_teal: { backgroundColor: colors.tealStrong },
  stepCircle_gold: { backgroundColor: colors.goldStrong },
  stepConnector: { flex: 0.4, height: StyleSheet.hairlineWidth, marginTop: spacing.md + spacing.xs, backgroundColor: colors.border },
  actions: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  flexOne: { flex: 1 },
});

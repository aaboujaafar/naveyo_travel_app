import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import {
  Badge,
  Button,
  Chip,
  Icon,
  IconButton,
  InlineMessage,
  Input,
  Surface,
  TextArea,
  AppText,
} from "../ui";
import {
  colors,
  componentMetrics,
  layout,
  radius,
  shadows,
  spacing,
} from "../theme";
import {
  calculateTripDuration,
  isCreateTripReady,
  type CreateTripFormValues,
} from "./create-trip-model";

export interface CreateTripScreenProps {
  canSubmit: boolean;
  saving: boolean;
  error?: string | null;
  onBack: () => void;
  onSubmit: (values: CreateTripFormValues) => Promise<void>;
}

const initialValues: CreateTripFormValues = {
  name: "Lisbonne, Portugal",
  startsOn: "2026-08-10",
  endsOn: "2026-08-17",
};

export function CreateTripScreen({
  canSubmit,
  saving,
  error,
  onBack,
  onSubmit,
}: CreateTripScreenProps) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState(initialValues);
  const duration = useMemo(
    () => calculateTripDuration(values.startsOn, values.endsOn),
    [values.endsOn, values.startsOn],
  );
  const ready = isCreateTripReady(values);
  const headerInsetStyle = useMemo(
    () => ({ paddingTop: Math.max(insets.top, spacing.lg) }),
    [insets.top],
  );
  const footerInsetStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, spacing.lg) }),
    [insets.bottom],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.scrollArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.header, headerInsetStyle]}>
            <IconButton
              icon={<Icon name="arrow-left" size={20} />}
              onPress={onBack}
              accessibilityLabel="Retour"
            />
            <AppText variant="h2" style={styles.headerTitle}>
              Nouveau voyage
            </AppText>
          </View>

          <ComingSoonSection title="Modèles rapides">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalChips}
            >
              {[
                "🚗  Road trip",
                "🏙️  City break",
                "🏖️  Plage",
                "🏔️  Aventure",
              ].map((label) => (
                <Chip key={label} label={label} />
              ))}
            </ScrollView>
          </ComingSoonSection>

          <ComingSoonSection title="Photo de couverture">
            <Image
              source={require("../../assets/trip-lisbon-cover.png")}
              style={styles.cover}
              resizeMode="cover"
              accessibilityLabel="Aperçu couverture Lisbonne"
            />
            <View style={styles.coverOptions}>
              <CoverOption
                id="coral"
                colors={componentMetrics.createTrip.coverGradients.coral}
                selected
              />
              <CoverOption
                id="ocean"
                colors={componentMetrics.createTrip.coverGradients.ocean}
              />
              <CoverOption
                id="gold"
                colors={componentMetrics.createTrip.coverGradients.gold}
              />
              <CoverOption
                id="violet"
                colors={componentMetrics.createTrip.coverGradients.violet}
              />
            </View>
          </ComingSoonSection>

          <FormSection title="Destination">
            <Input
              value={values.name}
              onChangeText={(name) => setValues((current) => ({ ...current, name }))}
              placeholder="Où partez-vous ?"
              leftIcon={<Icon name="map-pin" size={20} color={colors.muted} />}
              error={values.name.trim().length === 0 ? "Veuillez choisir une destination" : undefined}
            />
          </FormSection>

          <FormSection title="Dates du voyage">
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Input
                  value={values.startsOn}
                  onChangeText={(startsOn) =>
                    setValues((current) => ({ ...current, startsOn }))
                  }
                  accessibilityLabel="Date de départ"
                  placeholder="AAAA-MM-JJ"
                  rightIcon={<Icon name="calendar" size={16} />}
                />
              </View>
              <View style={styles.dateField}>
                <Input
                  value={values.endsOn}
                  onChangeText={(endsOn) =>
                    setValues((current) => ({ ...current, endsOn }))
                  }
                  accessibilityLabel="Date de retour"
                  placeholder="AAAA-MM-JJ"
                  rightIcon={<Icon name="calendar" size={16} />}
                />
              </View>
            </View>
            {duration ? (
              <View style={styles.durationBadge}>
                <Icon name="calendar" size={14} color={colors.teal} />
                <AppText variant="caption" color="teal">
                  {duration.days} jours · {duration.nights} nuits
                </AppText>
              </View>
            ) : (
              <InlineMessage
                variant="error"
                title="Dates invalides"
                message="La date de retour doit être après le départ."
              />
            )}
            <ComingSoonFrame>
              <View style={styles.weatherCard}>
                <AppText style={styles.weatherIcon}>☀️</AppText>
                <View style={styles.weatherInfo}>
                  <AppText variant="h3" color="gold">
                    28°C
                  </AppText>
                  <AppText variant="caption" color="muted">
                    Météo attendue à Lisbonne en août
                  </AppText>
                </View>
              </View>
            </ComingSoonFrame>
          </FormSection>

          <ComingSoonSection title="Voyageurs">
            <View style={styles.travelerRow}>
              <Surface variant="flat" style={styles.stepper}>
                <View style={styles.stepperButton}>
                  <AppText variant="h3">−</AppText>
                </View>
                <AppText variant="h3">4</AppText>
                <View style={styles.stepperButton}>
                  <AppText variant="h3">+</AppText>
                </View>
              </Surface>
              <AppText variant="bodySmall" color="muted">
                personnes
              </AppText>
            </View>
          </ComingSoonSection>

          <ComingSoonSection title="Type de voyage">
            <View style={styles.wrapRow}>
              {[
                "Famille",
                "Road trip",
                "Détente",
                "Aventure",
                "Culture",
              ].map((label, index) => (
                <Chip key={label} label={label} active={index === 0} />
              ))}
            </View>
          </ComingSoonSection>

          <ComingSoonSection title="Budget estimé">
            <Surface variant="flat" style={styles.budgetCard}>
              <View style={styles.budgetValueRow}>
                <AppText variant="h2" color="accent">
                  2 500 €
                </AppText>
                <AppText variant="caption" color="muted">
                  / famille
                </AppText>
              </View>
              <View style={styles.budgetTrack}>
                <View style={styles.budgetFill} />
                <View style={styles.budgetThumb} />
              </View>
              <View style={styles.budgetLabels}>
                <AppText variant="caption" color="muted">500 €</AppText>
                <AppText variant="caption" color="muted">5 000 €</AppText>
              </View>
            </Surface>
          </ComingSoonSection>

          <ComingSoonSection title="Villes étapes">
            <Surface variant="flat" style={styles.cityCard}>
              <AppText style={styles.flag}>🇵🇹</AppText>
              <View style={styles.cityInfo}>
                <AppText variant="label">Lisbonne</AppText>
                <AppText variant="caption" color="muted">
                  Destination principale · 7 nuits
                </AppText>
              </View>
              <Badge label="Base" />
            </Surface>
            {[
              "Sintra",
              "Cascais",
            ].map((city) => (
              <View key={city} style={styles.subDestination}>
                <View style={styles.subDestinationIcon}>
                  <Icon name="clock" size={14} color={colors.teal} />
                </View>
                <AppText variant="label" style={styles.subDestinationName}>
                  {city}
                </AppText>
                <AppText variant="caption" color="muted">
                  excursion jour
                </AppText>
                <Icon name="close" size={14} color={colors.muted} />
              </View>
            ))}
            <View style={styles.addStepButton}>
              <Icon name="plus" size={16} color={colors.muted} />
              <AppText variant="label" color="muted">
                Ajouter une étape
              </AppText>
            </View>
          </ComingSoonSection>

          <ComingSoonSection title="Préparation">
            <View style={styles.preparationCard}>
              <View style={styles.preparationIcon}>
                <Icon name="layers" size={20} color={colors.white} />
              </View>
              <View style={styles.preparationText}>
                <AppText variant="label">L’IA prépare votre checklist</AppText>
                <AppText variant="caption" color="muted">
                  Basée sur la météo et les activités
                </AppText>
              </View>
              <Icon name="arrow-right" size={20} color={colors.accent} />
            </View>
          </ComingSoonSection>

          <ComingSoonSection title="Notes / envies">
            <TextArea
              editable={false}
              value="Envie de découvrir les pastéis de Belém, visiter le château São Jorge et prévoir une journée plage à Cascais."
            />
          </ComingSoonSection>

          <ComingSoonSection title="Documents">
            <View style={styles.wrapRow}>
              <View style={styles.documentChip}>
                <Icon name="file-text" size={16} color={colors.muted} />
                <AppText variant="label" color="muted">
                  Documents de voyage
                </AppText>
              </View>
            </View>
          </ComingSoonSection>

          {error ? (
            <FormSection title="Création">
              <InlineMessage
                variant="error"
                title="Création impossible"
                message={error}
              />
            </FormSection>
          ) : null}
        </ScrollView>
      </View>

      <View style={[styles.footer, footerInsetStyle]}>
        <Button
          fullWidth
          loading={saving}
          disabled={!ready || !canSubmit}
          onPress={() => void onSubmit(values)}
        >
          Continuer — Inviter la famille
        </Button>
        <AppText
          variant="caption"
          color={ready ? "success" : "muted"}
          align="center"
        >
          {ready ? "Tout est prêt !" : "Renseignez destination et dates pour continuer"}
        </AppText>
      </View>
    </View>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="label">{title}</AppText>
      {children}
    </View>
  );
}

function ComingSoonSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <FormSection title={title}>
      <ComingSoonFrame>{children}</ComingSoonFrame>
    </FormSection>
  );
}

function ComingSoonFrame({ children }: { children: React.ReactNode }) {
  return (
    <View
      accessible
      style={styles.futureFrame}
      accessibilityLabel="Fonctionnalité à venir"
    >
      <View style={styles.futureContent} pointerEvents="none">
        {children}
      </View>
      <View style={styles.futureBadge}>
        <Badge label="À venir" variant="gold" />
      </View>
    </View>
  );
}

function CoverOption({
  id,
  colors: gradientColors,
  selected = false,
}: {
  id: string;
  colors: readonly [string, string];
  selected?: boolean;
}) {
  return (
    <Pressable
      disabled
      accessibilityLabel="Couverture à venir"
      style={[styles.coverOption, selected && styles.coverOptionSelected]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`cover-${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradientColors[0]} />
            <Stop offset="1" stopColor={gradientColors[1]} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#cover-${id})`} />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: layout.maxMobileWidth,
    alignSelf: "center",
    paddingBottom: componentMetrics.createTrip.footerReserve,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  horizontalChips: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  cover: {
    width: "100%",
    height: componentMetrics.createTrip.coverHeight,
    borderRadius: radius.md,
  },
  coverOptions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  coverOption: {
    flex: 1,
    height: componentMetrics.createTrip.coverOptionHeight,
    borderRadius: radius.sm,
    overflow: "hidden",
    borderWidth: componentMetrics.createTrip.coverOptionBorderWidth,
    borderColor: colors.transparent,
  },
  coverOptionSelected: {
    borderColor: colors.accent,
    ...shadows.accent,
  },
  dateRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  dateField: {
    flex: 1,
  },
  durationBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: componentMetrics.createTrip.compactActionPadding,
    borderRadius: radius.full,
    backgroundColor: colors.tealSoft,
  },
  weatherCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.goldSoft,
    borderWidth: componentMetrics.createTrip.thinBorderWidth,
    borderColor: colors.gold,
    borderRadius: radius.md,
  },
  weatherIcon: {
    fontSize: componentMetrics.createTrip.weatherIconFontSize,
  },
  weatherInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  travelerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: componentMetrics.createTrip.stepperVerticalPadding,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  stepperButton: {
    width: componentMetrics.createTrip.stepperButtonSize,
    height: componentMetrics.createTrip.stepperButtonSize,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    borderWidth: componentMetrics.createTrip.thinBorderWidth,
    borderColor: colors.border,
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  budgetCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  budgetValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  budgetTrack: {
    height: componentMetrics.createTrip.budgetTrackHeight,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    justifyContent: "center",
  },
  budgetFill: {
    width: "48%",
    height: componentMetrics.createTrip.budgetTrackHeight,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  budgetThumb: {
    position: "absolute",
    left: "46%",
    width: componentMetrics.createTrip.budgetThumbSize,
    height: componentMetrics.createTrip.budgetThumbSize,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: componentMetrics.createTrip.sliderThumbBorderWidth,
    borderColor: colors.accent,
  },
  budgetLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  flag: {
    fontSize: componentMetrics.createTrip.flagFontSize,
  },
  cityInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  subDestination: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: componentMetrics.createTrip.compactVerticalPadding,
    paddingHorizontal: componentMetrics.createTrip.compactHorizontalPadding,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: componentMetrics.createTrip.thinBorderWidth,
    borderColor: colors.border,
  },
  subDestinationIcon: {
    width: componentMetrics.createTrip.compactIconSize,
    height: componentMetrics.createTrip.compactIconSize,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tealSoft,
  },
  subDestinationName: {
    flex: 1,
  },
  addStepButton: {
    minHeight: layout.minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: componentMetrics.createTrip.compactActionPadding,
    borderRadius: radius.sm,
    borderWidth: componentMetrics.createTrip.dashedBorderWidth,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  preparationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: componentMetrics.createTrip.thinBorderWidth,
    borderColor: colors.accent,
  },
  preparationIcon: {
    width: componentMetrics.createTrip.preparationIconSize,
    height: componentMetrics.createTrip.preparationIconSize,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
  },
  preparationText: {
    flex: 1,
    gap: spacing.xs,
  },
  documentChip: {
    minHeight: layout.minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: componentMetrics.createTrip.compactHorizontalPadding,
    borderRadius: radius.full,
    borderWidth: componentMetrics.createTrip.dashedBorderWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  futureFrame: {
    position: "relative",
  },
  futureContent: {
    opacity: componentMetrics.createTrip.comingSoonOpacity,
  },
  futureBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },
  footer: {
    width: "100%",
    maxWidth: layout.maxMobileWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

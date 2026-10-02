import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MapModel } from "../adapters/map";
import { ExpoMapsView } from "../adapters/map/expo-maps-view";
import { colors, layout, radius, shadows, spacing } from "../theme";
import { AppText, Button, Icon, InlineMessage, Skeleton } from "../ui";
import { DestinationImage } from "../ui/DestinationImage";
import { formatLocalItineraryDate } from "./trip-map-model";
import type { TripRecap } from "./trip-recap-model";

export interface TripRecapScreenProps {
  recap: TripRecap | null;
  imageUrl?: string;
  map: MapModel | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onShare: () => void;
}

export function TripRecapScreen(props: TripRecapScreenProps) {
  const insets = useSafeAreaInsets();
  if (props.loading && !props.recap) {
    return <View style={[styles.screen, styles.loading]}><Skeleton height={spacing["2xl"] * 5} /><Skeleton height={spacing["2xl"] * 3} /></View>;
  }
  if (!props.recap) {
    return (
      <View style={[styles.screen, styles.loading, { paddingTop: insets.top + spacing.lg }]}>
        <InlineMessage variant="error" title="Récap indisponible" message={props.error ?? "Ce Voyage n’est plus accessible."} />
        <Button variant="secondary" onPress={props.onBack}>Retour</Button>
      </View>
    );
  }
  const recap = props.recap;
  const stats = [
    recap.days ? { value: String(recap.days), label: "jours" } : null,
    { value: String(recap.countries.length), label: "pays" },
    { value: String(recap.stops.length), label: recap.stops.length > 1 ? "étapes" : "étape" },
    { value: String(recap.activityCount), label: recap.activityCount > 1 ? "activités" : "activité" },
    recap.distance ? { value: recap.distance, label: "parcourus" } : null,
    recap.totalSpent ? { value: recap.totalSpent, label: "dépensés" } : null,
  ].filter((stat): stat is { value: string; label: string } => stat !== null);

  return (
    <View style={styles.screen} testID="trip-recap-screen">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <DestinationImage name={recap.title} imageUrl={props.imageUrl} style={styles.heroImage} />
          <View style={styles.heroShade} />
          <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={props.onBack} style={({ pressed }) => [styles.back, { top: Math.max(insets.top, spacing.md) }, pressed && styles.pressed]}>
            <Icon name="arrow-left" size={20} />
          </Pressable>
          <View style={styles.heroText}>
            <AppText variant="badge" color="onAccent">RÉCAP DU VOYAGE</AppText>
            <AppText variant="h1" color="onAccent" numberOfLines={2}>{recap.title}</AppText>
            <AppText variant="bodySmall" color="onAccent">{recap.dates}</AppText>
          </View>
        </View>

        <View style={styles.stats}>
          {stats.map((stat) => (
            <View key={stat.label} style={[styles.stat, shadows.sm]}>
              <AppText variant="h3" numberOfLines={1} adjustsFontSizeToFit>{stat.value}</AppText>
              <AppText variant="caption" color="muted">{stat.label}</AppText>
            </View>
          ))}
        </View>

        {recap.stops.length > 0 || recap.countries.length > 0 ? (
          <Section title="Itinéraire">
            {recap.countries.length > 0 ? <AppText variant="label">{recap.countries.join("  ")}</AppText> : null}
            {recap.stops.length > 0 ? <AppText variant="bodySmall" color="muted">{recap.stops.join(" → ")}</AppText> : null}
          </Section>
        ) : null}

        {props.map ? (
          <Section title="Trace du voyage">
            <ExpoMapsView model={props.map} style={styles.map} testID="trip-recap-map" />
          </Section>
        ) : null}

        {recap.highlights.length > 0 ? (
          <Section title="Ce que vous avez prévu">
            {recap.highlights.map((highlight, index) => (
              <View key={`${highlight.date}-${index}`} style={styles.highlight}>
                <AppText variant="caption" color="muted" style={styles.highlightDate}>{formatLocalItineraryDate(highlight.date)}</AppText>
                <AppText variant="bodySmall" style={styles.flexOne}>{highlight.title}</AppText>
              </View>
            ))}
          </Section>
        ) : null}

        {recap.topCategory ? (
          <Section title="Dépenses">
            <AppText variant="bodySmall" color="muted">{`${recap.totalSpent} au total, surtout en ${recap.topCategory.toLowerCase()}.`}</AppText>
          </Section>
        ) : null}

        <View style={styles.shareWrap}>
          <Button fullWidth onPress={props.onShare} icon={<Icon name="arrow-right" size={20} color={colors.white} />}>Partager le récap</Button>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><AppText variant="sectionTitle" color="muted">{title}</AppText>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  loading: { padding: spacing.lg, gap: spacing.md },
  content: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingBottom: spacing["2xl"] * 2 },
  hero: { height: spacing["2xl"] * 7, justifyContent: "flex-end" },
  heroImage: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%" },
  heroShade: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.fg, opacity: 0.35 },
  back: { position: "absolute", left: spacing.md, width: spacing["2xl"] - spacing.xs, height: spacing["2xl"] - spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  heroText: { padding: spacing.lg, gap: spacing.xs },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, padding: spacing.lg },
  stat: { width: "31%", flexGrow: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: spacing.xs },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl, gap: spacing.sm },
  map: { height: spacing["2xl"] * 5, borderRadius: radius.md, overflow: "hidden" },
  highlight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  highlightDate: { width: spacing["2xl"] * 2 },
  shareWrap: { paddingHorizontal: spacing.lg },
  flexOne: { flex: 1 },
  pressed: { transform: [{ scale: 0.97 }] },
});

import { useState } from "react";
import { Image, Linking, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SavedTransitMap } from "../modules/transit-maps";
import { colors, spacing } from "../theme";
import { AppText, Icon, IconButton } from "../ui";

/** Full-screen map read from the phone's storage; pinch to zoom (iOS scroll view zoom). */
export function TransitMapViewerScreen({ map, onBack }: { map: SavedTransitMap | null; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [failed, setFailed] = useState(false);
  const width = window.width;
  const height = map ? Math.round((width * map.height) / Math.max(1, map.width)) : 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton icon={<Icon name="arrow-left" size={20} />} onPress={onBack} accessibilityLabel="Retour" />
        <AppText variant="label" style={styles.flexOne} numberOfLines={1}>{map?.name ?? "Plan introuvable"}</AppText>
      </View>
      {map && !failed ? (
        <ScrollView
          style={styles.flexOne}
          contentContainerStyle={styles.zoomContent}
          maximumZoomScale={6}
          minimumZoomScale={1}
          bouncesZoom
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <Image source={{ uri: map.localUri }} style={{ width, height }} resizeMode="contain" accessibilityLabel={`Plan du réseau ${map.name}`} onError={() => setFailed(true)} />
        </ScrollView>
      ) : (
        <View style={styles.missing}>
          <AppText variant="bodySmall" color="muted" align="center">Ce plan n’est plus sur le téléphone. Téléchargez-le à nouveau depuis « Plans de transport ».</AppText>
        </View>
      )}
      {map ? (
        <View style={[styles.credit, { paddingBottom: insets.bottom + spacing.sm }]}>
          <AppText variant="caption" color="muted" numberOfLines={2} onPress={() => void Linking.openURL(map.attribution.sourceUrl)}>
            {`Pincez pour zoomer · © ${map.attribution.author} · ${map.attribution.license} · Wikimedia Commons`}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  zoomContent: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  missing: { flex: 1, justifyContent: "center", padding: spacing.xl },
  credit: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  flexOne: { flex: 1 },
});

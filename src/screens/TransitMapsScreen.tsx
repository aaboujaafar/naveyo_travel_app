import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Stop } from "../modules/_shared/model";
import { TRANSIT_KIND_LABELS, type SavedTransitMap, type TransitMapCandidate } from "../modules/transit-maps";
import { colors, layout, radius, spacing } from "../theme";
import { AppText, Button, Icon, IconButton, InlineMessage, Skeleton } from "../ui";

export interface TransitStopSection {
  stop: Stop;
  /** Null while searching; empty when no network map exists around the Stop. */
  candidates: TransitMapCandidate[] | null;
  error?: string;
}

export interface TransitMapsScreenProps {
  sections: TransitStopSection[];
  saved: SavedTransitMap[];
  /** Network ids being downloaded. */
  downloading: string[];
  error: string | null;
  online: boolean;
  onDownload: (stop: Stop, candidate: TransitMapCandidate) => void;
  onOpen: (map: SavedTransitMap) => void;
  onRemove: (map: SavedTransitMap) => void;
  onBack: () => void;
}

export function TransitMapsScreen(props: TransitMapsScreenProps) {
  const insets = useSafeAreaInsets();
  const savedById = new Map(props.saved.map((map) => [map.networkId, map]));
  // Maps already saved stay listed offline, even when the search cannot run.
  const savedElsewhere = props.saved.filter((map) => !props.sections.some((section) => section.candidates?.some((candidate) => candidate.networkId === map.networkId)));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon={<Icon name="arrow-left" size={20} />} onPress={props.onBack} accessibilityLabel="Retour" />
        <View style={styles.flexOne}>
          <AppText variant="h2">Plans de transport</AppText>
          <AppText variant="caption" color="muted">Métro et tram des Étapes, consultables sans réseau</AppText>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        {props.error ? <InlineMessage variant="error" title="Plans indisponibles" message={props.error} /> : null}
        {!props.online ? <InlineMessage title="Sans réseau" message="Les plans déjà téléchargés restent consultables ; la recherche reprendra avec le réseau." /> : null}

        {savedElsewhere.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="h3">Téléchargés</AppText>
            {savedElsewhere.map((map) => <SavedRow key={map.networkId} map={map} onOpen={props.onOpen} onRemove={props.onRemove} />)}
          </View>
        ) : null}

        {props.sections.map((section) => (
          <View key={section.stop.id} style={styles.section}>
            <AppText variant="h3">{section.stop.name}</AppText>
            {section.error ? <InlineMessage variant="error" title="Recherche impossible" message={section.error} /> : null}
            {section.candidates === null && !section.error ? <View style={styles.card}><Skeleton height={spacing.lg} width="60%" /><Skeleton height={spacing.sm} width="40%" /></View> : null}
            {section.candidates?.length === 0 ? (
              <View style={styles.card}>
                <AppText variant="bodySmall" color="muted">Aucun plan de métro ou de tram publié pour cette ville. Le réseau de bus se consulte sur place ou dans Plans.</AppText>
              </View>
            ) : null}
            {section.candidates?.map((candidate) => {
              const saved = savedById.get(candidate.networkId);
              if (saved) return <SavedRow key={candidate.networkId} map={saved} onOpen={props.onOpen} onRemove={props.onRemove} />;
              const busy = props.downloading.includes(candidate.networkId);
              return (
                <View key={candidate.networkId} style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.kindIcon}><Icon name="map" size={16} color={colors.tealStrong} /></View>
                    <View style={styles.flexOne}>
                      <AppText variant="label">{candidate.name}</AppText>
                      <AppText variant="caption" color="muted">{`${TRANSIT_KIND_LABELS[candidate.kind]}${candidate.distanceKm >= 5 ? ` · à ${Math.round(candidate.distanceKm)} km` : ""}`}</AppText>
                    </View>
                  </View>
                  <Button variant="secondary" fullWidth loading={busy} disabled={!props.online} onPress={() => props.onDownload(section.stop, candidate)}>
                    Télécharger le plan
                  </Button>
                </View>
              );
            })}
          </View>
        ))}

        <AppText variant="caption" color="muted" style={styles.footnote}>
          Plans libres de Wikimedia Commons, publiés par leurs auteurs : ils peuvent différer du plan officiel le plus récent.
        </AppText>
      </ScrollView>
    </View>
  );
}

function SavedRow({ map, onOpen, onRemove }: { map: SavedTransitMap; onOpen: (map: SavedTransitMap) => void; onRemove: (map: SavedTransitMap) => void }) {
  return (
    <View style={[styles.card, styles.savedCard]}>
      <Pressable accessibilityRole="button" onPress={() => onOpen(map)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={[styles.kindIcon, styles.savedIcon]}><Icon name="check" size={16} color={colors.white} /></View>
        <View style={styles.flexOne}>
          <AppText variant="label">{map.name}</AppText>
          <AppText variant="caption" color="teal">{`Disponible hors ligne · ${formatSize(map.sizeBytes)}`}</AppText>
        </View>
        <Icon name="arrow-right" size={16} color={colors.fg} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Supprimer le plan ${map.name}`} onPress={() => onRemove(map)} style={styles.removeLink}>
        <AppText variant="caption" color="muted">Supprimer du téléphone</AppText>
      </Pressable>
    </View>
  );
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return "taille inconnue";
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(bytes / 1000))} Ko`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  content: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingHorizontal: spacing.lg, gap: spacing.lg },
  section: { gap: spacing.sm },
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  savedCard: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  kindIcon: { width: 36, height: 36, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealSoft },
  savedIcon: { backgroundColor: colors.tealStrong },
  removeLink: { alignSelf: "flex-start", paddingVertical: spacing.xs },
  footnote: { textAlign: "center" },
  pressed: { opacity: 0.7 },
  flexOne: { flex: 1 },
});

import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TravelDocument, UUID } from "../modules/_shared/model";
import { colors, layout, radius, spacing } from "../theme";
import { AppText, Badge, Button, Icon, InlineMessage, Skeleton } from "../ui";
import { formatDocumentDate, formatDocumentSize, labelDocumentKind } from "./travel-records-model";

export interface DocumentStopOption { id: UUID; name: string }
export type DocumentFilter = UUID | "all" | "unclassified";

export interface TripDocumentsScreenProps {
  tripName: string;
  items: TravelDocument[];
  stops: DocumentStopOption[];
  filter: DocumentFilter;
  loading: boolean;
  error: string | null;
  downloadedId: string | null;
  canAssign: boolean;
  /** Absent when the screen is a tab. */
  onBack?: () => void;
  onRetry: () => Promise<void>;
  onSelectFilter: (filter: DocumentFilter) => void;
  onDownload: (document: TravelDocument) => Promise<void>;
  onAssign: (document: TravelDocument, stopId?: UUID) => Promise<void>;
  onOpenReservations: () => void;
  onOpenPacking: () => void;
  onImport: () => void;
}

export function TripDocumentsScreen(props: TripDocumentsScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <RecordsHeader title="Documents" subtitle={props.tripName} onBack={props.onBack} />
        <RecordsTabs active="documents" onOpenDocuments={() => undefined} onOpenReservations={props.onOpenReservations} onOpenPacking={props.onOpenPacking} />

        {props.error ? <View style={styles.message}><InlineMessage variant="error" title="Action impossible" message={props.error} /><Button variant="secondary" onPress={() => void props.onRetry()}>Réessayer</Button></View> : null}
        {props.downloadedId ? <View style={styles.message}><InlineMessage variant="success" title="Document téléchargé" message="Une copie persistante a été préparée sur l'iPhone, sans URL publique." /></View> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Filter label="Tous" active={props.filter === "all"} onPress={() => props.onSelectFilter("all")} />
          <Filter label="Non classés" active={props.filter === "unclassified"} onPress={() => props.onSelectFilter("unclassified")} />
          {props.stops.map((stop) => <Filter key={stop.id} label={stop.name} active={props.filter === stop.id} onPress={() => props.onSelectFilter(stop.id)} />)}
        </ScrollView>

        <View style={styles.panel}>
          {props.loading ? <DocumentsLoading /> : props.items.length === 0 ? <InlineMessage title="Aucun Document de voyage" message="Importez un fichier, relisez les données extraites, puis confirmez-les explicitement." /> : props.items.map((document) => (
            <View key={document.id} style={styles.documentCard}>
              <View style={styles.documentIcon}><Icon name="file-text" size={20} color={colors.teal} /></View>
              <View style={styles.documentInfo}>
                <AppText variant="label" numberOfLines={1}>{document.fileName ?? "Document sans nom"}</AppText>
                <AppText variant="caption" color="muted">{labelDocumentKind(document.kind)} · {formatDocumentSize(document.byteSize)}</AppText>
                <AppText variant="caption" color="muted">Ajouté le {formatDocumentDate(document.createdAt)}</AppText>
                <View style={styles.metaBadges}><Badge label="Privé" variant="teal" /><Badge label={document.stopId ? props.stops.find((stop) => stop.id === document.stopId)?.name ?? "Étape" : "Non classé"} variant="gold" /></View>
              </View>
              <Button size="sm" variant="secondary" onPress={() => void props.onDownload(document)}>Télécharger</Button>
              {props.canAssign && props.stops.length > 0 ? (
                <View style={styles.assignRow}>
                  <Filter label="Non classé" active={!document.stopId} onPress={() => void props.onAssign(document, undefined)} />
                  {props.stops.map((stop) => <Filter key={stop.id} label={stop.name} active={document.stopId === stop.id} onPress={() => void props.onAssign(document, stop.id)} />)}
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.importAction}>
          <Button fullWidth onPress={props.onImport} icon={<Icon name="plus" size={20} color={colors.white} />}>Importer un Document</Button>
          <View style={styles.security}><Icon name="info" size={16} color={colors.muted} /><AppText variant="caption" color="muted" style={styles.flexOne}>{"Fichiers privés à ce Voyage. Les pièces d’identité ne sont pas acceptées."}</AppText></View>
        </View>
      </ScrollView>
    </View>
  );
}

export function RecordsHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack?: () => void }) { return <View style={styles.header}>{onBack ? <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={onBack} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><Icon name="arrow-left" size={20} /></Pressable> : null}<View style={styles.flexOne}><AppText variant={onBack ? "h2" : "h1"}>{title}</AppText><AppText variant="caption" color="muted">{subtitle}</AppText></View></View>; }

export function RecordsTabs({ active, onOpenDocuments, onOpenReservations, onOpenPacking }: { active: "documents" | "reservations" | "packing"; onOpenDocuments: () => void; onOpenReservations: () => void; onOpenPacking: () => void }) { return <View style={styles.tabs}><Tab label="Documents" active={active === "documents"} onPress={onOpenDocuments} /><Tab label="Réservations" active={active === "reservations"} onPress={onOpenReservations} /><Tab label="Bagages" active={active === "packing"} onPress={onOpenPacking} /></View>; }
function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}><AppText variant="label" color={active ? "fg" : "muted"} align="center" numberOfLines={1}>{label}</AppText></Pressable>; }
function Filter({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.filter, active && styles.filterActive, pressed && styles.pressed]}><AppText variant="caption" color={active ? "accent" : "muted"}>{label}</AppText></Pressable>; }
function DocumentsLoading() { return <View style={styles.loading}><Skeleton height={spacing["2xl"] + spacing.lg} /><Skeleton height={spacing["2xl"] + spacing.lg} /></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, scrollContent: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingBottom: spacing["2xl"] * 3 }, header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg }, iconButton: { width: spacing["2xl"] - spacing.xs, height: spacing["2xl"] - spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.xs, borderRadius: radius.md, backgroundColor: colors.border }, tab: { flex: 1, minHeight: spacing["2xl"] - spacing.sm, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xs }, tabActive: { backgroundColor: colors.surface },
  message: { marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm }, filters: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }, filter: { minHeight: spacing["2xl"] - spacing.xs, paddingHorizontal: spacing.md - spacing.xs, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, filterActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent }, panel: { paddingHorizontal: spacing.lg }, documentCard: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginBottom: spacing.sm }, documentIcon: { width: spacing["2xl"] - spacing.sm, height: spacing["2xl"] - spacing.sm, borderRadius: radius.sm, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }, documentInfo: { flex: 1, minWidth: "45%", gap: spacing.xs }, metaBadges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, assignRow: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, security: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xs }, importAction: { gap: spacing.md, padding: spacing.lg },
  flexOne: { flex: 1 }, pressed: { transform: [{ scale: 0.97 }] }, loading: { gap: spacing.sm },
});

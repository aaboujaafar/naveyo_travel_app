import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AddPackingItemInput, PackingCategory, PackingItem } from "../modules/packing-list";
import type { UUID } from "../modules/_shared/model";
import { colors, layout, radius, shadows, spacing } from "../theme";
import { AppText, BottomSheet, Button, Icon, InlineMessage, Input, ProgressBar, Skeleton } from "../ui";
import { RecordsTabs } from "./TripDocumentsScreen";
import {
  derivePackingProgress,
  filterPackingItems,
  formatPackingProgress,
  labelPackingCategory,
  packingCategories,
  packingCategoryLabels,
  packingStatusLabels,
  sortPackingItems,
  type PackingCategoryFilter,
  type PackingStatusFilter,
} from "./trip-packing-model";

export interface PackingStopOption { id: UUID; name: string }

export interface TripPackingScreenProps {
  tripName: string;
  items: readonly PackingItem[];
  stops?: readonly PackingStopOption[];
  loading: boolean;
  saving?: boolean;
  error: string | null;
  onBack: () => void;
  onOpenDocuments: () => void;
  onOpenReservations: () => void;
  onRetry: () => Promise<void>;
  /** Resolves to false when the item could not be saved, so the form keeps its input. */
  onAddItem: (input: Omit<AddPackingItemInput, "tripId">) => Promise<boolean | void>;
  onTogglePacked: (item: PackingItem, packed: boolean) => Promise<void>;
  onRemoveItem: (item: PackingItem) => Promise<void>;
}

export function TripPackingScreen(props: TripPackingScreenProps) {
  const insets = useSafeAreaInsets();
  const [statusFilter, setStatusFilter] = useState<PackingStatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<PackingCategoryFilter>("all");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState<PackingCategory>("other");
  const [stopId, setStopId] = useState<UUID | undefined>();

  const progress = useMemo(() => derivePackingProgress(props.items), [props.items]);
  const visibleItems = useMemo(
    () => sortPackingItems(filterPackingItems(props.items, statusFilter, categoryFilter)),
    [categoryFilter, props.items, statusFilter],
  );

  async function addItem() {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;
    const saved = await props.onAddItem({
      label: trimmedLabel,
      category,
      quantity: parseQuantity(quantity),
      stopId,
    });
    if (saved === false) return;
    setLabel("");
    setQuantity("1");
    setCategory("other");
    setStopId(undefined);
    setSheetVisible(false);
  }

  function confirmRemove(item: PackingItem) {
    Alert.alert(
      "Supprimer cet élément ?",
      `« ${item.label} » sera retiré de la liste pour tous les voyageurs.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => void props.onRemoveItem(item) },
      ],
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={props.onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Icon name="arrow-left" size={20} />
          </Pressable>
          <View style={styles.flexOne}>
            <AppText variant="h2">Bagages</AppText>
            <AppText variant="caption" color="muted">{props.tripName}</AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Actualiser la liste de bagages" onPress={() => void props.onRetry()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Icon name="refresh" size={20} />
          </Pressable>
        </View>

        <RecordsTabs active="packing" onOpenDocuments={props.onOpenDocuments} onOpenReservations={props.onOpenReservations} onOpenPacking={() => undefined} />

        {props.error ? <View style={styles.message}><InlineMessage variant="error" title="Action impossible" message={props.error} /><Button variant="secondary" onPress={() => void props.onRetry()}>Réessayer</Button></View> : null}

        <View style={[styles.progressCard, shadows.md]} accessible accessibilityLabel={`Progression de préparation : ${formatPackingProgress(progress)}`}>
          <View style={styles.progressHeading}><View><AppText variant="h3">Progression</AppText><AppText variant="caption" color="muted">{formatPackingProgress(progress)}</AppText></View><AppText variant="h2" color="accent">{Math.round(progress.ratio * 100)}%</AppText></View>
          <ProgressBar progress={progress.ratio} color="accent" height={8} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityRole="tablist">
          {(Object.keys(packingStatusLabels) as PackingStatusFilter[]).map((value) => <FilterChip key={value} label={packingStatusLabels[value]} active={statusFilter === value} onPress={() => setStatusFilter(value)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityLabel="Filtrer par catégorie">
          <FilterChip label="Toutes les catégories" active={categoryFilter === "all"} onPress={() => setCategoryFilter("all")} />
          {packingCategories.map((value) => <FilterChip key={value} label={packingCategoryLabels[value]} active={categoryFilter === value} onPress={() => setCategoryFilter(value)} />)}
        </ScrollView>

        <View style={styles.list}>
          {props.loading ? <PackingLoading /> : visibleItems.length === 0 ? <InlineMessage title={props.items.length === 0 ? "Aucun élément à préparer" : "Aucun résultat"} message={props.items.length === 0 ? "Ajoutez les affaires nécessaires à votre Voyage." : "Modifiez les filtres pour afficher d’autres éléments."} /> : visibleItems.map((item) => <PackingRow key={item.id} item={item} stopName={props.stops?.find((stop) => stop.id === item.stopId)?.name} onToggle={(packed) => void props.onTogglePacked(item, packed)} onRemove={() => confirmRemove(item)} />)}
        </View>
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel="Ajouter un élément à préparer" onPress={() => setSheetVisible(true)} style={({ pressed }) => [styles.fab, shadows.lg, pressed && styles.pressed]}><Icon name="plus" size={24} color={colors.white} /></Pressable>

      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title="Ajouter aux bagages" maxHeight={700}>
        {props.error && sheetVisible ? <InlineMessage variant="error" title="Ajout impossible" message={props.error} /> : null}
        <Input label="Élément" value={label} onChangeText={setLabel} placeholder="Passeport, t-shirt…" returnKeyType="done" />
        <Input label="Quantité (1 à 99)" value={quantity} onChangeText={(value) => setQuantity(value.replace(/[^0-9]/g, "").slice(0, 2))} keyboardType="number-pad" maxLength={2} />
        <AppText variant="label">Catégorie</AppText>
        <View style={styles.choiceWrap}>{packingCategories.map((value) => <ChoiceChip key={value} label={labelPackingCategory(value)} active={category === value} onPress={() => setCategory(value)} />)}</View>
        {props.stops && props.stops.length > 0 ? <><AppText variant="label">Étape (facultative)</AppText><View style={styles.choiceWrap}><ChoiceChip label="Aucune Étape" active={!stopId} onPress={() => setStopId(undefined)} />{props.stops.map((stop) => <ChoiceChip key={stop.id} label={stop.name} active={stopId === stop.id} onPress={() => setStopId(stop.id)} />)}</View></> : null}
        <Button fullWidth loading={props.saving} disabled={!label.trim()} onPress={() => void addItem()}>Ajouter l’élément</Button>
      </BottomSheet>
    </View>
  );
}

function PackingRow({ item, stopName, onToggle, onRemove }: { item: PackingItem; stopName?: string; onToggle: (packed: boolean) => void; onRemove: () => void }) {
  const detail = `${labelPackingCategory(item.category)} · quantité ${item.quantity}${stopName ? ` · ${stopName}` : ""}`;
  return <View style={[styles.itemCard, item.packed && styles.itemPacked]}>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.packed }} accessibilityLabel={`${item.label}, ${detail}`} accessibilityHint={item.packed ? "Marquer à préparer" : "Marquer prêt"} onPress={() => onToggle(!item.packed)} style={({ pressed }) => [styles.itemToggle, pressed && styles.pressed]}>
      <View style={[styles.checkBox, item.packed && styles.checkBoxChecked]}>{item.packed ? <Icon name="check" size={16} color={colors.white} /> : null}</View>
      <View style={styles.itemBody}><AppText variant="label" numberOfLines={2} style={item.packed ? styles.struck : undefined}>{item.label}</AppText><AppText variant="caption" color="muted">{detail}</AppText></View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`Supprimer ${item.label}`} onPress={onRemove} hitSlop={8} style={styles.deleteButton}><Icon name="close" size={20} color={colors.danger} /></Pressable>
  </View>;
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={`Filtrer : ${label}`} onPress={onPress} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}><AppText variant="caption" color={active ? "accent" : "muted"}>{label}</AppText></Pressable>;
}

function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}><AppText variant="caption" color={active ? "accent" : "muted"}>{label}</AppText></Pressable>;
}

function parseQuantity(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(99, Math.max(1, parsed)) : 1;
}

function PackingLoading() { return <View style={styles.loading}><Skeleton height={72} /><Skeleton height={72} /><Skeleton height={72} /></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, scrollContent: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingBottom: spacing["2xl"] * 3 }, header: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg }, backButton: { width: spacing["2xl"] - spacing.xs, height: spacing["2xl"] - spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }, message: { marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm }, progressCard: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, gap: spacing.md }, progressHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, filters: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }, chip: { minHeight: spacing["2xl"] - spacing.xs, paddingHorizontal: spacing.md - spacing.xs, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent }, list: { marginHorizontal: spacing.lg, marginTop: spacing.md, gap: spacing.sm }, itemCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, itemPacked: { backgroundColor: colors.tealSoft, borderColor: colors.teal }, itemToggle: { flex: 1, minWidth: 0, minHeight: layout.minimumTouchTarget, flexDirection: "row", alignItems: "center", gap: spacing.md }, checkBox: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, checkBoxChecked: { backgroundColor: colors.teal, borderColor: colors.teal }, itemBody: { flex: 1, minWidth: 0, gap: spacing.xs }, struck: { textDecorationLine: "line-through", color: colors.muted }, deleteButton: { width: layout.minimumTouchTarget, height: layout.minimumTouchTarget, alignItems: "center", justifyContent: "center" }, fab: { position: "absolute", right: spacing.lg, bottom: spacing.lg, width: spacing["2xl"] + spacing.sm, height: spacing["2xl"] + spacing.sm, borderRadius: radius.full, backgroundColor: colors.accentStrong, alignItems: "center", justifyContent: "center" }, choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, flexOne: { flex: 1 }, pressed: { transform: [{ scale: 0.97 }] }, loading: { gap: spacing.sm },
});

import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, layout, radius, spacing } from "../theme";
import { AppText } from "./AppText";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { Checkbox } from "./Checkbox";
import { Chip } from "./Chip";
import { Divider } from "./Divider";
import { Input } from "./Input";
import { InlineMessage } from "./InlineMessage";
import { Icon, type IconName } from "./Icon";
import { ListItem } from "./ListItem";
import { ProgressBar } from "./ProgressBar";
import { Switch } from "./Switch";

export function UiCatalogScreen() {
  const [inputValue, setInputValue] = useState("");
  const [selectedChip, setSelectedChip] = useState("Tous");
  const [checked, setChecked] = useState(true);
  const [enabled, setEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Badge label="Développement" variant="teal" />
          <AppText variant="h1">Catalogue UI Naveyo</AppText>
          <AppText color="muted">
            Fondations traduites depuis les templates HTML à 390 px.
          </AppText>
        </View>

        <CatalogSection title="Couleurs">
          <View style={styles.swatchGrid}>
            {swatches.map((swatch) => (
              <View key={swatch.label} style={styles.swatchItem}>
                <View style={[styles.swatch, swatch.style]} />
                <AppText variant="label">{swatch.label}</AppText>
                <AppText variant="caption" color="muted">
                  {swatch.value}
                </AppText>
              </View>
            ))}
          </View>
        </CatalogSection>

        <CatalogSection title="Typographie">
          <AppText variant="displayHero">Voyage à Lisbonne</AppText>
          <AppText variant="h1">Préparez votre Voyage</AppText>
          <AppText variant="h2">Programme du jour</AppText>
          <AppText variant="h3">Restaurant choisi</AppText>
          <AppText>
            Toutes les informations utiles restent lisibles et disponibles.
          </AppText>
          <AppText variant="bodySmall" color="muted">
            Dernière synchronisation aujourd’hui à 08:30.
          </AppText>
          <AppText variant="sectionTitle" color="muted">
            Prochaine étape
          </AppText>
        </CatalogSection>

        <CatalogSection title="Icônes">
          <View style={styles.iconGrid}>
            {catalogIcons.map((name) => (
              <View key={name} style={styles.iconItem}>
                <Icon name={name} color={colors.fg} />
                <AppText variant="caption" color="muted" align="center">
                  {name}
                </AppText>
              </View>
            ))}
          </View>
        </CatalogSection>

        <CatalogSection title="Actions">
          <Button fullWidth onPress={() => undefined}>
            Action principale
          </Button>
          <Button fullWidth variant="secondary" onPress={() => undefined}>
            Action secondaire
          </Button>
          <Button fullWidth variant="ghost" onPress={() => undefined}>
            Action discrète
          </Button>
        </CatalogSection>

        <CatalogSection title="Filtres et statuts">
          <View style={styles.rowWrap}>
            {["Tous", "Itinéraire", "Documents"].map((label) => (
              <Chip
                key={label}
                label={label}
                active={selectedChip === label}
                onPress={() => setSelectedChip(label)}
              />
            ))}
          </View>
          <View style={styles.rowWrap}>
            <Badge label="Confirmé" variant="success" />
            <Badge label="Suggestion IA" variant="teal" />
            <Badge label="À vérifier" variant="gold" />
          </View>
        </CatalogSection>

        <CatalogSection title="Formulaire et progression">
          <Input
            label="Nom du Voyage"
            placeholder="Ex. Lisbonne 2026"
            value={inputValue}
            onChangeText={setInputValue}
            hint="Ce nom sera visible par les deux membres."
          />
          <ProgressBar progress={0.64} />
          <AppText variant="caption" color="muted">
            64 % du Voyage est prêt
          </AppText>
        </CatalogSection>

        <CatalogSection title="Sélection et messages">
          <Checkbox checked={checked} label="Document disponible hors ligne" onChange={setChecked} />
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <AppText variant="label">Synchronisation automatique</AppText>
              <AppText variant="caption" color="muted">
                Uniquement lorsque le réseau est disponible
              </AppText>
            </View>
            <Switch value={enabled} label="Synchronisation automatique" onChange={setEnabled} />
          </View>
          <InlineMessage
            title="Voyage disponible hors ligne"
            message="Dernière synchronisation aujourd’hui à 08:30."
            variant="success"
          />
          <Divider />
          <ListItem
            title="Documents du Voyage"
            subtitle="3 documents téléchargés"
            leading={<Icon name="file-text" color={colors.teal} />}
            onPress={() => undefined}
          />
        </CatalogSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function CatalogSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="sectionTitle" color="muted">
        {title}
      </AppText>
      <Card style={styles.card}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    width: "100%",
    maxWidth: layout.maxMobileWidth,
    alignSelf: "center",
    paddingHorizontal: layout.screenHorizontalPadding,
    paddingVertical: spacing.xl,
    paddingBottom: spacing["2xl"],
    gap: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
    gap: spacing.md,
  },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  swatchItem: {
    width: "46%",
    gap: spacing.xs,
  },
  swatch: {
    height: spacing["2xl"],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  swatchBg: { backgroundColor: colors.bg },
  swatchSurface: { backgroundColor: colors.surface },
  swatchFg: { backgroundColor: colors.fg },
  swatchAccent: { backgroundColor: colors.accent },
  swatchTeal: { backgroundColor: colors.teal },
  swatchGold: { backgroundColor: colors.gold },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  iconItem: {
    width: "20%",
    minHeight: layout.minimumTouchTarget,
    alignItems: "center",
    gap: spacing.xs,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  settingText: {
    flex: 1,
    gap: spacing.xs,
  },
});

const swatches = [
  { label: "Fond", value: colors.bg, style: styles.swatchBg },
  { label: "Surface", value: colors.surface, style: styles.swatchSurface },
  { label: "Texte", value: colors.fg, style: styles.swatchFg },
  { label: "Corail", value: colors.accent, style: styles.swatchAccent },
  { label: "Teal", value: colors.teal, style: styles.swatchTeal },
  { label: "Or", value: colors.gold, style: styles.swatchGold },
] as const;

const catalogIcons = [
  "arrow-left",
  "arrow-right",
  "home",
  "search",
  "calendar",
  "map-pin",
  "users",
  "sparkles",
  "wallet",
  "file-text",
  "settings",
  "refresh",
] as const satisfies readonly IconName[];

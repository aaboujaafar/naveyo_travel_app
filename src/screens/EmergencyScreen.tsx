import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout, radius, spacing } from "../theme";
import { AppText, Icon, IconButton, InlineMessage } from "../ui";
import type { EmergencyCountry, EmergencyStay } from "./emergency-model";
import { formatCountry } from "./place-detail-model";

const ADVICE_URL = "https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/conseils-par-pays-destination/";

export interface EmergencyScreenProps {
  countries: EmergencyCountry[];
  offline: boolean;
  error: string | null;
  onBack: () => void;
}

export function EmergencyScreen(props: EmergencyScreenProps) {
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<{ stay: EmergencyStay; phrase: string } | null>(null);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon={<Icon name="arrow-left" size={20} />} onPress={props.onBack} accessibilityLabel="Retour" />
        <View style={styles.flexOne}>
          <AppText variant="h2">Urgence</AppText>
          <AppText variant="caption" color="muted">{props.offline ? "Depuis le dernier téléchargement · sans réseau" : "Disponible aussi sans réseau"}</AppText>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        {props.error ? <InlineMessage variant="error" title="Voyage indisponible" message={props.error} /> : null}
        {props.countries.map((country) => (
          <View key={country.countryCode} style={styles.section}>
            <AppText variant="h3">{formatCountry(country.countryCode) ?? country.countryCode}</AppText>
            <AppText variant="caption" color="muted">{country.stops.join(" · ")}</AppText>

            {country.numbers ? (
              <View style={styles.card}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Appeler le ${country.numbers.general}`} onPress={() => void Linking.openURL(`tel:${country.numbers!.general}`)} style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}>
                  <AppText variant="caption" color="onAccent">Urgences</AppText>
                  <AppText variant="h1" color="onAccent">{country.numbers.general}</AppText>
                  <AppText variant="caption" color="onAccent">Toucher pour appeler</AppText>
                </Pressable>
                {otherNumbers(country).length > 0 ? (
                  <View style={styles.numbers}>
                    {otherNumbers(country).map(([label, value]) => (
                      <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label} : ${value}`} onPress={() => void Linking.openURL(`tel:${value}`)} style={styles.numberChip}>
                        <AppText variant="caption" color="muted">{label}</AppText>
                        <AppText variant="label">{value}</AppText>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : (
              <InlineMessage title="Numéro à vérifier" message="Ce pays n’est pas encore dans la fiche : renseignez-vous à l’arrivée. Le 112 fonctionne dans de nombreux pays depuis un portable." />
            )}

            {country.stays.length > 0 ? country.stays.map((stay) => (
              <View key={`${stay.name}-${stay.from ?? ""}`} style={styles.card}>
                <View style={styles.row}>
                  <Icon name="home" size={20} color={colors.tealStrong} />
                  <View style={styles.flexOne}>
                    <AppText variant="label">{stay.name}</AppText>
                    <AppText variant="bodySmall" color="muted" selectable>{stay.address ?? "Adresse absente de la confirmation"}</AppText>
                  </View>
                </View>
                {stay.address ? (
                  <Pressable accessibilityRole="button" onPress={() => setShown({ stay, phrase: country.taxiPhrase })} style={styles.showButton}>
                    <Icon name="map-pin" size={16} color={colors.white} />
                    <AppText variant="label" color="onAccent">Montrer au chauffeur</AppText>
                  </Pressable>
                ) : null}
              </View>
            )) : (
              <View style={styles.card}>
                <AppText variant="bodySmall" color="muted">Aucun hébergement confirmé dans ce pays. Importez la confirmation pour retrouver son adresse ici, même sans réseau.</AppText>
              </View>
            )}
          </View>
        ))}

        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(ADVICE_URL)} style={styles.card}>
          <View style={styles.row}>
            <Icon name="info" size={20} color={colors.fg} />
            <View style={styles.flexOne}>
              <AppText variant="label">Conseils aux voyageurs</AppText>
              <AppText variant="caption" color="muted">Ambassade, consulat et situation du pays sur diplomatie.gouv.fr (réseau nécessaire)</AppText>
            </View>
            <Icon name="arrow-right" size={16} color={colors.fg} />
          </View>
        </Pressable>
      </ScrollView>

      <Modal visible={shown !== null} animationType="fade" onRequestClose={() => setShown(null)} supportedOrientations={["portrait", "landscape"]}>
        <View style={[styles.driver, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setShown(null)} style={styles.close}>
            <Icon name="close" size={24} color={colors.fg} />
          </Pressable>
          <AppText variant="h2" align="center">{shown?.phrase}</AppText>
          <AppText variant="h1" align="center" style={styles.driverAddress}>{shown?.stay.address}</AppText>
          <AppText variant="h3" align="center" color="muted">{shown?.stay.name}</AppText>
        </View>
      </Modal>
    </View>
  );
}

/** Service numbers that differ from the general one. */
function otherNumbers(country: EmergencyCountry): [string, string][] {
  const numbers = country.numbers;
  if (!numbers) return [];
  return ([["Police", numbers.police], ["Ambulance", numbers.ambulance], ["Pompiers", numbers.fire]] as const)
    .flatMap(([label, value]): [string, string][] => (value && value !== numbers.general ? [[label, value]] : []));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  content: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingHorizontal: spacing.lg, gap: spacing.lg },
  section: { gap: spacing.sm },
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  callButton: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.lg, borderRadius: radius.md, backgroundColor: colors.danger },
  numbers: { flexDirection: "row", gap: spacing.sm },
  numberChip: { flex: 1, alignItems: "center", gap: 2, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.bg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  showButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.full, backgroundColor: colors.accentStrong },
  driver: { flex: 1, justifyContent: "center", gap: spacing.xl, paddingHorizontal: spacing.xl, backgroundColor: colors.surface },
  driverAddress: { fontSize: 34, lineHeight: 42 },
  close: { position: "absolute", top: spacing["2xl"], right: spacing.lg, padding: spacing.sm },
  pressed: { opacity: 0.8 },
  flexOne: { flex: 1 },
});

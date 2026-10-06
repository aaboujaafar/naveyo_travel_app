import { Linking, Pressable, StyleSheet, View } from "react-native";
import type { PartnerLink } from "../modules/partners";
import { colors, radius, spacing } from "../theme";
import { AppText, BottomSheet, Icon, InlineMessage, Skeleton } from "../ui";

export interface PartnerSearchGroup {
  title: string;
  detail?: string;
  links: PartnerLink[];
}

/** Partner searches for one gap, already filled with dates, places and travellers. */
export function PartnerSearchSheet({ visible, title, summary, groups, loading, onOpened, onClose }: {
  visible: boolean;
  title: string;
  /** What is searched, also to copy on partner pages that open empty. */
  summary: string;
  groups: PartnerSearchGroup[] | null;
  loading: boolean;
  onOpened: (link: PartnerLink) => void;
  onClose: () => void;
}) {
  const open = async (link: PartnerLink) => {
    await Linking.openURL(link.url);
    onOpened(link);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.summary}>
        <AppText variant="label" selectable>{summary}</AppText>
      </View>
      {loading || !groups ? (
        <View style={styles.group}><Skeleton height={56} /><Skeleton height={56} /></View>
      ) : groups.length === 0 ? (
        <InlineMessage title="Aucune recherche" message="Aucun partenaire ne couvre ce trajet pour le moment." />
      ) : groups.map((group) => (
        <View key={group.title} style={styles.group}>
          <View>
            <AppText variant="caption" color="muted">{group.title}</AppText>
            {group.detail ? <AppText variant="caption" color="muted">{group.detail}</AppText> : null}
          </View>
          {group.links.map((link) => (
            <Pressable key={`${group.title}-${link.partner}`} accessibilityRole="link" onPress={() => void open(link)} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
              <View style={styles.flexOne}>
                <AppText variant="label">{link.label}</AppText>
                <AppText variant="caption" color="muted">{link.prefilled ? "Recherche déjà remplie" : "Recopiez le trajet ci-dessus sur le site"}</AppText>
              </View>
              <Icon name="arrow-right" size={16} color={colors.fg} />
            </Pressable>
          ))}
        </View>
      ))}
      <AppText variant="caption" color="muted" style={styles.disclosure}>
        Liens partenaires : Naveyo peut percevoir une commission si vous réservez, sans frais pour vous.
      </AppText>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  summary: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tealSoft },
  group: { gap: spacing.sm },
  link: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  disclosure: { textAlign: "center" },
  pressed: { opacity: 0.7 },
  flexOne: { flex: 1 },
});

import { Linking, Pressable, StyleSheet, View } from "react-native";
import { countryFlag, countryName } from "../modules/countries";
import { MATRIX_SOURCE } from "../modules/entry-requirements/matrix";
import type { Formality } from "../modules/entry-requirements/formalities";
import { colors, radius, spacing } from "../theme";
import { AppText, Icon } from "../ui";
import { shortDate } from "./logistics-model";

const LEVEL_ICON = { ok: "check", task: "file-text", warning: "info", danger: "info", unknown: "info" } as const;

/**
 * Entry formalities in « Préparation »: one line per country and situation,
 * tasks to tick, always with the official page and the data's date.
 */
export function FormalitiesBlock({ formalities, checked, matrixDate, nationalityMissing, onToggle, onSetNationality }: {
  formalities: Formality[];
  checked: ReadonlySet<string>;
  matrixDate: string;
  nationalityMissing: boolean;
  onToggle?: (key: string, done: boolean) => void;
  onSetNationality: () => void;
}) {
  const tasks = formalities.filter((item) => item.level === "task");
  const done = tasks.filter((item) => checked.has(item.key)).length;

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <AppText variant="label">Formalités d’entrée</AppText>
        {tasks.length > 0 ? <AppText variant="label" color={done === tasks.length ? "success" : "accent"}>{`${done} sur ${tasks.length}`}</AppText> : null}
      </View>

      {nationalityMissing ? (
        <Pressable accessibilityRole="button" onPress={onSetNationality} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={[styles.icon, styles.iconTask]}><Icon name="users" size={14} color={colors.accentStrong} /></View>
          <View style={styles.flexOne}>
            <AppText variant="label">Indiquer votre nationalité</AppText>
            <AppText variant="caption" color="muted">Pour savoir s’il faut un visa ou une autorisation</AppText>
          </View>
          <Icon name="arrow-right" size={16} color={colors.accentStrong} />
        </Pressable>
      ) : null}

      {formalities.map((item) => {
        const isDone = checked.has(item.key);
        const isTask = item.level === "task";
        return (
          <View key={item.key} style={styles.row}>
            {isTask && onToggle ? (
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: isDone }} accessibilityLabel={item.title} onPress={() => onToggle(item.key, !isDone)} hitSlop={8} style={[styles.icon, isDone ? styles.iconDone : styles.iconTask]}>
                {isDone ? <Icon name="check" size={14} color={colors.white} /> : null}
              </Pressable>
            ) : (
              <View style={[styles.icon, item.level === "ok" ? styles.iconOk : item.level === "task" ? styles.iconTask : styles.iconAlert]}>
                <Icon name={LEVEL_ICON[item.level]} size={14} color={item.level === "ok" ? colors.white : item.level === "task" ? colors.accentStrong : colors.danger} />
              </View>
            )}
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(item.link.url)} style={({ pressed }) => [styles.flexOne, pressed && styles.pressed]}>
              <AppText variant="label" color={isDone ? "muted" : item.level === "danger" ? "danger" : "fg"}>
                {`${countryFlag(item.countryCode)} ${countryName(item.countryCode) ?? item.countryCode} · ${item.title}`}
              </AppText>
              <AppText variant="caption" color="muted">
                {[item.detail, item.deadline && !isDone ? `avant le ${shortDate(item.deadline)}` : null, item.nationalities.length > 0 ? `passeport ${item.nationalities.map(countryFlag).join(" ")}` : null].filter(Boolean).join(" · ")}
              </AppText>
              <AppText variant="caption" color="teal">{`${item.link.name} ›`}</AppText>
            </Pressable>
          </View>
        );
      })}

      <AppText variant="caption" color="muted">
        {`Indicatif, d’après les données ${MATRIX_SOURCE.name.split(" (")[0]} du ${longDate(matrixDate)}. Les conditions changent : vérifiez sur la page officielle avant de partir, ainsi que la validité de vos passeports.`}
      </AppText>
    </View>
  );
}

function longDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(parsed);
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingVertical: spacing.xs },
  icon: { width: 24, height: 24, borderRadius: radius.full, alignItems: "center", justifyContent: "center", borderWidth: 1.5, marginTop: 2 },
  iconOk: { backgroundColor: colors.tealStrong, borderColor: colors.tealStrong },
  iconTask: { borderColor: colors.accentStrong },
  iconDone: { backgroundColor: colors.tealStrong, borderColor: colors.tealStrong },
  iconAlert: { borderColor: colors.danger },
  pressed: { opacity: 0.7 },
  flexOne: { flex: 1, gap: 2 },
});

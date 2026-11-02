import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { countryFlag, searchCountries } from "../modules/countries";
import { colors, radius, spacing } from "../theme";
import { AppText, BottomSheet, InlineMessage, Input } from "../ui";

/** Picks a country by its French name; works offline. */
export function CountryPickerSheet({ visible, title, hint, onPick, onClear, onClose }: {
  visible: boolean;
  title: string;
  hint?: string;
  onPick: (countryCode: string) => Promise<void> | void;
  onClear?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const results = useMemo(() => searchCountries(query).slice(0, 30), [query]);

  const pick = async (code: string) => {
    setError(null);
    try {
      await onPick(code);
      setQuery("");
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} maxHeight={640}>
      {hint ? <AppText variant="bodySmall" color="muted">{hint}</AppText> : null}
      <Input value={query} onChangeText={setQuery} placeholder="France, Canada, Maroc…" autoCorrect={false} />
      {error ? <InlineMessage variant="error" title="Enregistrement impossible" message={error} /> : null}
      <View style={styles.list}>
        {results.map((country) => (
          <Pressable key={country.code} accessibilityRole="button" onPress={() => void pick(country.code)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <AppText variant="label">{`${countryFlag(country.code)}  ${country.name}`}</AppText>
          </Pressable>
        ))}
      </View>
      {onClear ? (
        <Pressable accessibilityRole="button" onPress={() => void Promise.resolve(onClear()).then(onClose)} style={styles.clear}>
          <AppText variant="caption" color="muted">Retirer</AppText>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: { padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.bg },
  clear: { alignSelf: "center", padding: spacing.sm },
  pressed: { opacity: 0.7 },
});

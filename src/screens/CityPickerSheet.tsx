import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useNaveyoBootstrap } from "../bootstrap";
import type { PlaceCandidate, UUID } from "../modules/_shared/model";
import type { CityRef } from "../modules/trip-profiles";
import { colors, radius, spacing } from "../theme";
import { AppText, BottomSheet, Icon, InlineMessage, Input } from "../ui";
import { describePlacesError } from "./places-error";
import { formatCountry } from "./place-detail-model";

/** Searches a city with the places provider, as when creating an Étape. */
export function CityPickerSheet({ visible, tripId, title, hint, onPick, onClear, onClose }: {
  visible: boolean;
  /** Place searches are authorised per Voyage. */
  tripId: UUID;
  title: string;
  hint?: string;
  onPick: (city: CityRef) => Promise<void> | void;
  /** Offered when a city is already set. */
  onClear?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const places = useNaveyoBootstrap()?.modules.places;
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceCandidate[]>([]);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const text = query.trim();
    if (!places || text.length < 2) return;
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      void places.autocomplete({ query: text, tripId, type: "city", limit: 5 }).then((results) => {
        if (id !== requestId.current) return;
        setSuggestions(results.slice(0, 5));
        setError(null);
      }).catch((cause: unknown) => {
        if (id === requestId.current) { setSuggestions([]); setError({ title: "Recherche impossible", message: describePlacesError(cause) }); }
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [places, query, tripId]);

  const pick = async (candidate: PlaceCandidate) => {
    if (!candidate.countryCode) {
      setError({ title: "Ville incomplète", message: "Cette ville n’a pas de pays connu : choisissez-en une autre." });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onPick({ name: candidate.name, countryCode: candidate.countryCode.toUpperCase(), ...(candidate.coordinates ? { coordinates: candidate.coordinates } : {}) });
      setQuery("");
      setSuggestions([]);
      onClose();
    } catch (cause) {
      setError({ title: "Enregistrement impossible", message: cause instanceof Error ? cause.message : "Réessayez plus tard." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      {hint ? <AppText variant="bodySmall" color="muted">{hint}</AppText> : null}
      <Input value={query} onChangeText={(text) => { setQuery(text); setError(null); }} placeholder="Paris, Lyon, Bruxelles…" autoCorrect={false} autoFocus />
      {error ? <InlineMessage variant="error" title={error.title} message={error.message} /> : null}
      <View style={styles.list}>
        {suggestions.map((candidate) => (
          <Pressable key={candidate.id} accessibilityRole="button" disabled={saving} onPress={() => void pick(candidate)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Icon name="map-pin" size={16} color={colors.tealStrong} />
            <View style={styles.flexOne}>
              <AppText variant="label">{candidate.name}</AppText>
              <AppText variant="caption" color="muted" numberOfLines={1}>{[formatCountry(candidate.countryCode), candidate.address].filter(Boolean).join(" · ")}</AppText>
            </View>
          </Pressable>
        ))}
      </View>
      {onClear ? (
        <Pressable accessibilityRole="button" onPress={() => void Promise.resolve(onClear()).then(onClose)} style={styles.clear}>
          <AppText variant="caption" color="muted">Retirer la ville</AppText>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.bg },
  clear: { alignSelf: "center", padding: spacing.sm },
  pressed: { opacity: 0.7 },
  flexOne: { flex: 1 },
});

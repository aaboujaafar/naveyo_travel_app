import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, Input, ScreenNote, ShellFrame, StatusPanel } from "../../../../../src/ui";
import { useTripAssistant } from "../../../../../src/modules/trip-assistant";
import type { SuggestionDraft } from "../../../../../src/modules/trip-assistant";
import type { UUID } from "../../../../../src/modules/_shared/model";
import { colors } from "../../../../../src/theme/colors";
import { spacing } from "../../../../../src/theme/spacing";
import { typography } from "../../../../../src/theme/typography";

export default function TripAssistantScreen() {
  const router = useRouter();
  const { tripId, stopId } = useLocalSearchParams<{ tripId: string; stopId: string }>();
  const assistant = useTripAssistant();
  const [query, setQuery] = useState("restaurant, musée, balade...");
  const [preferences, setPreferences] = useState("");
  const [drafts, setDrafts] = useState<SuggestionDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const discover = async () => {
    if (!assistant || !tripId || !stopId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await assistant.suggestPlaces({
        tripId: tripId as UUID,
        stopId: stopId as UUID,
        query,
        preferences: preferences || undefined,
      });
      setDrafts(result);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Suggestions indisponibles");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShellFrame title="Découvrir autour" subtitle="Des idées contrôlées, jamais ajoutées automatiquement.">
      <Card style={styles.heroCard}>
        <Badge label="SUGGESTION IA" variant="accent" />
        <Text style={styles.heroTitle}>Trouver une bonne idée</Text>
        <Text style={styles.heroMessage}>
          Naveyo recherche d’abord de vrais lieux, puis demande à l’IA de les classer. Les résultats restent des brouillons.
        </Text>
      </Card>

      <View style={styles.form}>
        <Input label="Que cherches-tu ?" value={query} onChangeText={setQuery} placeholder="restaurant, musée..." />
        <Input label="Préférences (facultatif)" value={preferences} onChangeText={setPreferences} placeholder="calme, local, végétarien..." />
        {error ? <StatusPanel kind="error" title="Recherche impossible" message={error} /> : null}
        <Button fullWidth loading={loading} disabled={!assistant || query.trim().length < 2} onPress={() => void discover()}>
          Découvrir autour de cette Étape
        </Button>
      </View>

      {drafts.length === 0 && !loading ? (
        <StatusPanel kind="empty" title="Aucune suggestion pour l’instant" message="Lance une recherche pour obtenir jusqu’à cinq propositions." />
      ) : null}

      <View style={styles.results}>
        {drafts.map((draft) => (
          <Card key={draft.id} style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Badge label="BROUILLON" variant="gold" />
              <Text style={styles.candidateId}>Lieu vérifié</Text>
            </View>
            <Text style={styles.resultTitle}>{draft.title}</Text>
            <Text style={styles.resultReason}>{draft.reason}</Text>
            <Text style={styles.confirmation}>À confirmer avant tout ajout à l’itinéraire.</Text>
          </Card>
        ))}
      </View>

      <ScreenNote>Les suggestions réussies sont conservées pour consultation ultérieure. L’IA ne modifie jamais directement l’itinéraire.</ScreenNote>
      <Button fullWidth variant="secondary" onPress={() => router.back()}>Retour à l’Étape</Button>
    </ShellFrame>
  );
}

const styles = StyleSheet.create({
  heroCard: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.accentSoft, borderColor: colors.accent },
  heroTitle: { ...typography.h2, color: colors.fg },
  heroMessage: { ...typography.bodySmall, color: colors.muted },
  form: { gap: spacing.md },
  results: { gap: spacing.md },
  resultCard: { padding: spacing.lg, gap: spacing.sm },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  candidateId: { ...typography.caption, color: colors.teal },
  resultTitle: { ...typography.h3, color: colors.fg },
  resultReason: { ...typography.bodySmall, color: colors.muted },
  confirmation: { ...typography.caption, color: colors.gold },
});

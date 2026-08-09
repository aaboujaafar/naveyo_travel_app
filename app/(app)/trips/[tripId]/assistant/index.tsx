import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, Input, ScreenNote, ShellFrame, StatusPanel } from "../../../../../src/ui";
import { useTripAssistant } from "../../../../../src/modules/trip-assistant";
import type { SuggestionDraft } from "../../../../../src/modules/trip-assistant";
import type { Stop, Trip, UUID } from "../../../../../src/modules/_shared/model";
import { useTripsModule } from "../../../../../src/modules/trips";
import { colors } from "../../../../../src/theme/colors";
import { spacing } from "../../../../../src/theme/spacing";
import { typography } from "../../../../../src/theme/typography";

export default function TripAssistantScreen() {
  const router = useRouter();
  const { tripId, stopId } = useLocalSearchParams<{ tripId: string; stopId: string }>();
  const assistant = useTripAssistant();
  const trips = useTripsModule();
  const [query, setQuery] = useState("restaurant, musée, balade...");
  const [preferences, setPreferences] = useState("");
  const [drafts, setDrafts] = useState<SuggestionDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugRequest, setDebugRequest] = useState<string | null>(null);
  const [debugResponse, setDebugResponse] = useState<string | null>(null);
  const [debugTrip, setDebugTrip] = useState<Trip | null>(null);
  const [debugStop, setDebugStop] = useState<Stop | null>(null);

  useEffect(() => {
    if (!trips || !tripId || !stopId) return;
    let mounted = true;
    void Promise.all([
      trips.get(tripId as UUID),
      trips.listStops(tripId as UUID),
    ])
      .then(([trip, stops]) => {
        if (!mounted) return;
        setDebugTrip(trip);
        setDebugStop(stops.find((stop) => stop.id === stopId) ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setDebugTrip(null);
        setDebugStop(null);
      });
    return () => {
      mounted = false;
    };
  }, [stopId, tripId, trips]);

  const discover = async () => {
    if (!assistant || !tripId || !stopId) return;
    const requestPayload = {
      tripId: tripId as UUID,
      stopId: stopId as UUID,
      query,
      preferences: preferences || undefined,
    };
    setDebugRequest(JSON.stringify(requestPayload, null, 2));
    setDebugResponse(null);
    setLoading(true);
    setError(null);
    try {
      const result = await assistant.suggestPlaces(requestPayload);
      setDrafts(result);
      setDebugResponse(JSON.stringify(result, null, 2));
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : "Suggestions indisponibles";
      setError(message);
      setDebugResponse(JSON.stringify({ error: message }, null, 2));
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
      <Card style={styles.debugCard}>
        <Badge label="DEBUG IA" variant="gold" />
        <Text style={styles.debugLabel}>Entrée envoyée</Text>
        <Text selectable style={styles.debugText}>{debugRequest ?? "Aucune requête envoyée"}</Text>
        <Text style={styles.debugLabel}>Retour reçu</Text>
        <Text selectable style={styles.debugText}>{debugResponse ?? "Aucun retour reçu"}</Text>
        <Text style={styles.debugLabel}>Contexte Trip / Stop chargé par l’app</Text>
        <Text selectable style={styles.debugText}>{JSON.stringify({ trip: debugTrip, stop: debugStop }, null, 2)}</Text>
      </Card>
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
  debugCard: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surface },
  debugLabel: { ...typography.caption, color: colors.muted },
  debugText: { ...typography.caption, color: colors.fg, fontFamily: "Menlo" },
});

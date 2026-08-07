import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import {
  Badge,
  Button,
  Card,
  ScreenNote,
  ShellFrame,
  StatusPanel,
  TextArea,
} from "../../../src/ui";
import type { ReservationDraft, UUID } from "../../../src/modules/_shared/model";
import {
  analyzeReservationImport,
  InMemoryReservationsModule,
  ManualReservationAnalyzer,
  type ReservationImportResult,
} from "../../../src/modules/reservations";
import { colors } from "../../../src/theme/colors";
import { spacing } from "../../../src/theme/spacing";
import { typography } from "../../../src/theme/typography";

const defaultTripId = "00000000-0000-4000-8000-000000000001" as UUID;
const reservations = new InMemoryReservationsModule();
const analyzer = new ManualReservationAnalyzer();

export default function ReservationImportScreen() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId?: string }>();
  const tripId = (rawTripId ?? defaultTripId) as UUID;
  const [sourceText, setSourceText] = useState("");
  const [result, setResult] = useState<ReservationImportResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (isAnalyzing || !sourceText.trim()) {
      setError("Ajoutez le contenu de la confirmation à analyser.");
      return;
    }
    setError(null);
    setResult(null);
    setIsAnalyzing(true);
    try {
      const next = await analyzeReservationImport(analyzer, {
        uri: `text:${encodeURIComponent(sourceText)}`,
        kind: "text",
        sizeBytes: new TextEncoder().encode(sourceText).byteLength,
      });
      if (next.state === "needs-confirmation") {
        const existing = await reservations.findDuplicate(tripId, next.draft);
        setResult(
          existing
            ? { state: "duplicate", draft: next.draft, existing }
            : next,
        );
      } else {
        setResult(next);
      }
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Import impossible");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function confirm(draft: ReservationDraft) {
    setIsSaving(true);
    setError(null);
    try {
      await reservations.confirm({
        tripId,
        draft,
        confirmedFields: draft.fieldsRequiringConfirmation,
      });
      router.replace(`/(app)/trips/${tripId}/reservations`);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ShellFrame
      title="Importer une réservation"
      subtitle="Un brouillon est toujours vérifié avant l’enregistrement."
      headerAction={
        <Button size="sm" variant="secondary" onPress={() => router.back()}>
          Fermer
        </Button>
      }
    >
      <Card style={styles.card}>
        <Badge label="FALLBACK LOCAL" variant="gold" />
        <Text style={styles.cardTitle}>Coller une confirmation</Text>
        <Text style={styles.cardMessage}>
          Le partage iOS et l’analyse PDF/OCR seront branchés par les tâches natives.
          Pour l’instant, utilisez une ligne par champ.
        </Text>
        <TextArea
          label="Contenu"
          value={sourceText}
          onChangeText={setSourceText}
          placeholder={'type=flight\ntitle=Vol Paris Athènes\nprovider=Aegean\nreference=AB123'}
          autoCapitalize="none"
          returnKeyType="done"
        />
        <Button fullWidth onPress={() => void analyze()} loading={isAnalyzing}>
          Analyser le brouillon
        </Button>
      </Card>

      {error ? <StatusPanel kind="error" title="Import impossible" message={error} /> : null}
      {result?.state === "error" ? (
        <StatusPanel kind="error" title="Brouillon invalide" message={result.message} />
      ) : null}
      {result?.state === "duplicate" ? (
        <StatusPanel
          kind="error"
          title="Réservation déjà importée"
          message={`Cette confirmation correspond à « ${result.existing.title} ». Rien n’a été modifié.`}
          actionLabel="Voir les réservations"
          onAction={() => router.replace(`/(app)/trips/${tripId}/reservations`)}
        />
      ) : null}
      {result?.state === "needs-confirmation" ? (
        <DraftCard draft={result.draft} onConfirm={confirm} loading={isSaving} />
      ) : null}
      <ScreenNote>
        Une analyse ne crée jamais une Réservation confirmée automatiquement. Les champs
        identifiés doivent être relus avant validation.
      </ScreenNote>
    </ShellFrame>
  );
}

function DraftCard({
  draft,
  onConfirm,
  loading,
}: {
  draft: ReservationDraft;
  onConfirm: (draft: ReservationDraft) => Promise<void>;
  loading: boolean;
}) {
  return (
    <Card style={styles.card}>
      <Badge label="À CONFIRMER" variant="teal" />
      <Text style={styles.cardTitle}>{draft.title ?? "Titre manquant"}</Text>
      <Text style={styles.detail}>Type : {draft.type ?? "À préciser"}</Text>
      <Text style={styles.detail}>Prestataire : {draft.provider ?? "À préciser"}</Text>
      <Text style={styles.detail}>Référence : {draft.reference ?? "À préciser"}</Text>
      <Text style={styles.confirmationLabel}>
        Champs à relire : {draft.fieldsRequiringConfirmation.join(", ") || "aucun"}
      </Text>
      <Button fullWidth onPress={() => void onConfirm(draft)} loading={loading}>
        Confirmer la réservation
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm },
  cardTitle: { ...typography.h3, color: colors.fg },
  cardMessage: { ...typography.bodySmall, color: colors.muted },
  detail: { ...typography.bodySmall, color: colors.fg },
  confirmationLabel: { ...typography.caption, color: colors.accent },
});

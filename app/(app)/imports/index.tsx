import * as DocumentPicker from "expo-document-picker";
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
  ManualReservationAnalyzer,
  sharedLocalReservations,
  type ReservationImportResult,
} from "../../../src/modules/reservations";
import { createAppleDocumentAnalyzer } from "../../../src/adapters/apple-document-analysis";
import { createOpenCodeDocumentAnalyzer } from "../../../src/adapters/opencode-document-analysis";
import { createSupabaseClient } from "../../../src/bootstrap/supabase";
import { colors } from "../../../src/theme/colors";
import { spacing } from "../../../src/theme/spacing";
import { typography } from "../../../src/theme/typography";

const defaultTripId = "00000000-0000-4000-8000-000000000001" as UUID;
const analyzer = new ManualReservationAnalyzer();

export default function ReservationImportScreen() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId?: string }>();
  const tripId = (rawTripId ?? defaultTripId) as UUID;
  const [sourceText, setSourceText] = useState("");
  const [selectedSource, setSelectedSource] = useState<{
    uri: string;
    kind: "pdf" | "image";
    fileName?: string;
    sizeBytes?: number;
  } | null>(null);
  const [result, setResult] = useState<ReservationImportResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (isAnalyzing || (!sourceText.trim() && !selectedSource)) {
      setError("Ajoutez le contenu de la confirmation à analyser.");
      return;
    }
    setError(null);
    setResult(null);
    setIsAnalyzing(true);
    try {
      const source = selectedSource ?? {
        uri: `text:${encodeURIComponent(sourceText)}`,
        kind: "text" as const,
        sizeBytes: new TextEncoder().encode(sourceText).byteLength,
      };
      let draft: ReservationDraft;
      if (selectedSource) {
        const local = await createAppleDocumentAnalyzer().analyze(selectedSource.uri);
        draft = local;
        if (local.confidence !== "high") {
          try {
            draft = await createOpenCodeDocumentAnalyzer(createSupabaseClient()).analyze({
              tripId,
              extractedText: local.extractedText,
            });
          } catch {
            // Keep the local draft when the remote provider is unavailable.
          }
        }
      } else if (sourceText.trim()) {
        try {
          draft = await createOpenCodeDocumentAnalyzer(createSupabaseClient()).analyze({
            tripId,
            extractedText: sourceText,
          });
        } catch {
          draft = await analyzer.analyze(source);
        }
      } else {
        draft = await analyzer.analyze(source);
      }
      const next = { state: "needs-confirmation" as const, draft };
      if (next.state === "needs-confirmation") {
        const existing = await sharedLocalReservations.findDuplicate(tripId, next.draft);
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

  async function chooseDocument() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    setSelectedSource({
      uri: asset.uri,
      kind: asset.mimeType === "application/pdf" ? "pdf" : "image",
      fileName: asset.name,
      sizeBytes: asset.size,
    });
    setSourceText("");
  }

  async function confirm(draft: ReservationDraft) {
    setIsSaving(true);
    setError(null);
    try {
      await sharedLocalReservations.confirm({
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
          Choisissez un PDF ou une image pour l’analyse locale, ou utilisez le fallback texte.
        </Text>
        <Button fullWidth variant="secondary" onPress={() => void chooseDocument()}>
          Choisir un PDF ou une image
        </Button>
        {selectedSource ? <Text style={styles.selectedFile}>Fichier : {selectedSource.fileName ?? selectedSource.uri}</Text> : null}
        <TextArea
          label="Contenu"
          value={sourceText}
          onChangeText={(value) => {
            setSourceText(value);
            setSelectedSource(null);
          }}
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
  selectedFile: { ...typography.caption, color: colors.teal },
});

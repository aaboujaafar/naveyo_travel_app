import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import type { ReservationDraft, Trip, UUID } from "../../../src/modules/_shared/model";
import { useTripsModule } from "../../../src/modules/trips";
import type { ReservationImportResult } from "../../../src/modules/reservations";
import { sharedLocalReservations } from "../../../src/bootstrap/reservations";
import { createAppleDocumentAnalyzer, createAppleShareInbox, type PendingShareImport } from "../../../src/adapters/apple-document-analysis";
import { createOpenCodeDocumentAnalyzer } from "../../../src/adapters/opencode-document-analysis";
import { createSupabaseClient } from "../../../src/bootstrap/supabase";
import { colors } from "../../../src/theme/colors";
import { spacing } from "../../../src/theme/spacing";
import { typography } from "../../../src/theme/typography";

export default function ReservationImportScreen() {
  const router = useRouter();
  const { tripId: rawTripId, pendingId: rawPendingId } = useLocalSearchParams<{ tripId?: string; pendingId?: string }>();
  const tripId = rawTripId as UUID | undefined;
  const pendingId = rawPendingId as string | undefined;
  const trips = useTripsModule();
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
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [pendingImports, setPendingImports] = useState<PendingShareImport[]>([]);

  useEffect(() => {
    const inbox = createAppleShareInbox();
    void inbox.list().then(setPendingImports).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Impossible de charger l’import"));
    if (!tripId && trips) {
      void trips.list().then(setAvailableTrips).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Impossible de charger les Voyages"));
    }
  }, [tripId, trips]);

  useEffect(() => {
    if (!tripId || !pendingId) return;
    const pending = pendingImports.find((item) => item.id === pendingId);
    if (!pending) return;
    void Promise.resolve().then(() => {
      if (pending.kind === "text") {
        setSourceText(pending.text ?? "");
        setSelectedSource(null);
      } else {
        setSelectedSource({
          uri: pending.uri,
          kind: pending.mimeType === "application/pdf" ? "pdf" : "image",
          fileName: pending.fileName,
        });
        setSourceText("");
      }
    });
  }, [pendingId, pendingImports, tripId]);

  const activePending = pendingImports.find((item) => item.status !== "confirmed");

  async function analyze() {
    if (!tripId) {
      setError("Sélectionnez d’abord un Voyage.");
      return;
    }
    if (isAnalyzing || (!sourceText.trim() && !selectedSource)) {
      setError("Ajoutez le contenu de la confirmation à analyser.");
      return;
    }
    setError(null);
    setResult(null);
    setIsAnalyzing(true);
    try {
      if (pendingId) await createAppleShareInbox().updateStatus(pendingId, "processing");
      let draft: ReservationDraft;
      if (selectedSource) {
        const local = await createAppleDocumentAnalyzer().analyze(selectedSource.uri);
        draft = await createOpenCodeDocumentAnalyzer(createSupabaseClient()).analyze({
          tripId,
          extractedText: local.extractedText,
        });
      } else if (sourceText.trim()) {
        draft = await createOpenCodeDocumentAnalyzer(createSupabaseClient()).analyze({
          tripId,
          extractedText: sourceText,
        });
      } else {
        throw new Error("Le texte du document est requis pour OpenCode.");
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
      if (pendingId) await createAppleShareInbox().updateStatus(pendingId, "failed", cause instanceof Error ? cause.message : "Analyse OpenCode impossible");
      setError(cause instanceof Error ? `Analyse OpenCode impossible : ${cause.message}` : "Analyse OpenCode impossible");
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
    if (!tripId) return;
    setIsSaving(true);
    setError(null);
    try {
      await sharedLocalReservations.confirm({
        tripId,
        draft,
        confirmedFields: draft.fieldsRequiringConfirmation,
      });
      if (pendingId) await createAppleShareInbox().updateStatus(pendingId, "confirmed");
      router.replace(`/(app)/trips/${tripId}/reservations`);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible");
    } finally {
      setIsSaving(false);
    }
  }

  const goBackOrHome = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <ShellFrame
      title="Importer une réservation"
      subtitle="Un brouillon est toujours vérifié avant l’enregistrement."
      headerAction={
        <Button size="sm" variant="secondary" onPress={goBackOrHome}>
          Fermer
        </Button>
      }
    >
      <Card style={styles.card}>
        {!tripId ? <TripPicker trips={availableTrips} pending={activePending} onSelect={(selectedTripId) => {
          const pending = activePending;
          router.replace(pending ? `/(app)/imports?tripId=${selectedTripId}&pendingId=${pending.id}` : `/(app)/imports?tripId=${selectedTripId}`);
        }} /> : null}
        {tripId ? <>
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
        </> : null}
      </Card>

      <ImportCenter items={pendingImports} />

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

function ImportCenter({ items }: { items: PendingShareImport[] }) {
  if (items.length === 0) return null;
  return <Card style={styles.card}>
    <Badge label="CENTRE D’IMPORT" variant="gold" />
    <Text style={styles.cardTitle}>Documents partagés</Text>
    {items.map((item) => <Text key={item.id} style={styles.detail}>
      {item.fileName ?? "Texte partagé"} · {item.status === "confirmed" ? "traité" : item.status === "failed" ? "échec" : item.status === "processing" ? "en analyse" : "à traiter"}
    </Text>)}
  </Card>;
}

function TripPicker({ trips, pending, onSelect }: { trips: Trip[]; pending?: PendingShareImport; onSelect: (tripId: UUID) => void }) {
  return <>
    <Badge label="NOUVEL IMPORT" variant="teal" />
    <Text style={styles.cardTitle}>Associer au Voyage</Text>
    <Text style={styles.cardMessage}>{pending ? `Document en attente : ${pending.fileName ?? pending.id}` : "Choisissez le Voyage auquel rattacher ce document."}</Text>
    {trips.length === 0 ? <StatusPanel kind="info" title="Aucun Voyage disponible" message="Créez ou rejoignez un Voyage avant d’importer cette réservation." /> : null}
    {trips.map((trip) => <Button key={trip.id} fullWidth variant="secondary" onPress={() => onSelect(trip.id)}>{trip.name}</Button>)}
  </>;
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

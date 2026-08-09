import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text } from "react-native";
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
import { createAppleDocumentTextExtractor, createAppleShareInbox, type PendingShareImport } from "../../../src/adapters/apple-document-analysis";
import { createOpenCodeDocumentAnalyzer } from "../../../src/adapters/opencode-document-analysis";
import { createSupabaseClient } from "../../../src/bootstrap/supabase";
import { colors } from "../../../src/theme/colors";
import { spacing } from "../../../src/theme/spacing";
import { typography } from "../../../src/theme/typography";
import { describeAnalysisFailure, recoverPendingImport } from "./import-state";
import { selectPendingImport } from "./import-selection";

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
  const [isOffline, setIsOffline] = useState(false);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [pendingImports, setPendingImports] = useState<PendingShareImport[]>([]);

  useEffect(() => {
    let mounted = true;
    const loadPendingImports = async () => {
      try {
        const inbox = createAppleShareInbox();
        const listed = await inbox.list();
        const recovered = listed.map(recoverPendingImport);
        await Promise.all(
          listed
            .filter((item) => item.status === "processing")
            .map((item) => inbox.updateStatus(item.id, "seen")),
        );
        if (mounted) setPendingImports(recovered);
      } catch (cause: unknown) {
        if (!mounted) return;
        const failure = describeAnalysisFailure(cause);
        setIsOffline(failure.isOffline);
        setError(failure.message || "Impossible de charger l’import");
      }
    };
    void loadPendingImports();
    if (!tripId && trips) {
      void trips.list().then(setAvailableTrips).catch((cause: unknown) => {
        if (!mounted) return;
        const failure = describeAnalysisFailure(cause);
        setIsOffline(failure.isOffline);
        setError(failure.isOffline ? failure.message : "Impossible de charger les Voyages");
      });
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void loadPendingImports();
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
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

  const activePending = selectPendingImport(pendingImports, pendingId);

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
      if (pendingId) {
        const inbox = createAppleShareInbox();
        await inbox.updateStatus(pendingId, "processing");
        await inbox.list().then(setPendingImports);
      }
      let draft: ReservationDraft;
      if (selectedSource) {
        const extractedText = await createAppleDocumentTextExtractor().extract(selectedSource.uri);
        draft = await createOpenCodeDocumentAnalyzer(createSupabaseClient()).analyze({
          tripId,
          extractedText,
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
      const failure = describeAnalysisFailure(cause);
      if (pendingId) {
        const inbox = createAppleShareInbox();
        try {
          await inbox.updateStatus(pendingId, "failed", failure.message);
          await inbox.list().then(setPendingImports);
        } catch {
          // Preserve the analysis error when the native inbox cannot update its status.
        }
      }
      setIsOffline(failure.isOffline);
      setError(failure.message);
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
      if (pendingId) {
        const inbox = createAppleShareInbox();
        try {
          await inbox.updateStatus(pendingId, "confirmed");
          await inbox.list().then(setPendingImports);
        } catch {
          // The reservation is already persisted; status refresh can be retried from the center.
        }
      }
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
        <Badge label="ANALYSE OPENCODE" variant="teal" />
        <Text style={styles.cardTitle}>Coller une confirmation</Text>
        <Text style={styles.cardMessage}>
          Le texte est extrait localement si nécessaire, puis analysé par OpenCode avant confirmation.
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

      {isOffline ? (
        <StatusPanel
          kind="info"
          title="Mode hors ligne"
          message="Les imports déjà reçus restent disponibles sur cet appareil. L’analyse OpenCode reprendra dès que la connexion sera rétablie."
        />
      ) : null}
      <ImportCenter
        items={pendingImports}
        tripId={tripId}
        onRetry={(id) => router.replace(`/(app)/imports?pendingId=${encodeURIComponent(id)}${tripId ? `&tripId=${tripId}` : ""}`)}
        onSelect={(id) => router.replace(`/(app)/imports?pendingId=${encodeURIComponent(id)}${tripId ? `&tripId=${tripId}` : ""}`)}
      />

      {error ? <StatusPanel kind="error" title="Import impossible" message={error} actionLabel="Réessayer" onAction={() => void analyze()} /> : null}
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

function ImportCenter({
  items,
  tripId,
  onRetry,
  onSelect,
}: {
  items: PendingShareImport[];
  tripId?: UUID;
  onRetry: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return <Card style={styles.card}>
    <Badge label="CENTRE D’IMPORT" variant="gold" />
    <Text style={styles.cardTitle}>Documents partagés</Text>
    {items.map((item) => <Card key={item.id} style={styles.importItem}>
      <Text style={styles.detail}>
        {item.fileName ?? "Texte partagé"} · {item.status === "confirmed" ? "traité" : item.status === "failed" ? "échec" : item.status === "processing" ? "en analyse" : "à traiter"}
      </Text>
      {item.error ? <Text style={styles.errorDetail}>{item.error}</Text> : null}
      {item.status === "failed" || item.status === "seen" ? <Button size="sm" variant="secondary" onPress={() => onRetry(item.id)}>{tripId ? "Analyser cet import" : "Associer ce document"}</Button> : null}
      {item.status === "processing" ? <Button size="sm" variant="secondary" onPress={() => onSelect(item.id)}>Ouvrir cet import</Button> : null}
    </Card>)}
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
  importItem: { padding: spacing.sm, gap: spacing.xs },
  errorDetail: { ...typography.caption, color: colors.danger },
});

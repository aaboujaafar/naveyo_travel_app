import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import type { ReservationDraft, Trip, UUID } from "../../../src/modules/_shared/model";
import { useTripsModule } from "../../../src/modules/trips";
import { validateImportSource, type ReservationImportResult } from "../../../src/modules/reservations";
import { sharedLocalReservations } from "../../../src/bootstrap/reservations";
import { createAppleDocumentTextExtractor, createAppleShareInbox, type PendingShareImport } from "../../../src/adapters/apple-document-analysis";
import { createOpenCodeDocumentAnalyzer } from "../../../src/adapters/opencode-document-analysis";
import { createSupabaseClient } from "../../../src/bootstrap/supabase";
import { describeAnalysisFailure, recoverPendingImport } from "../../../src/modules/reservations/import-state";
import { selectPendingImport } from "../../../src/modules/reservations/import-selection";
import { ReservationImportScreen as ReservationImportView } from "../../../src/screens/ReservationImportScreen";

export default function ReservationImportRoute() {
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
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);

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
        if (mounted) {
          setPendingImports(recovered);
          setIsLoadingInbox(false);
        }
      } catch (cause: unknown) {
        if (!mounted) return;
        const failure = describeAnalysisFailure(cause);
        setIsOffline(failure.isOffline);
        setError(failure.message || "Impossible de charger l’import");
        setIsLoadingInbox(false);
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
        validateImportSource(selectedSource);
        const extractedText = await createAppleDocumentTextExtractor().extract(selectedSource.uri, { maxPages: 50 });
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
    const source = {
      uri: asset.uri,
      kind: asset.mimeType === "application/pdf" ? "pdf" as const : "image" as const,
      fileName: asset.name,
      sizeBytes: asset.size,
    };
    try {
      validateImportSource(source);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Document non pris en charge");
      return;
    }
    setSelectedSource(source);
    setSourceText("");
  }

  async function confirm(draft: ReservationDraft, confirmedFields: string[]) {
    if (!tripId) return;
    setIsSaving(true);
    setError(null);
    try {
      await sharedLocalReservations.confirm({
        tripId,
        draft,
        confirmedFields,
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
    <ReservationImportView
      key={pendingId ?? "manual-import"}
      tripId={tripId}
      trips={availableTrips}
      pendingImports={pendingImports}
      activePending={activePending}
      input={{ text: sourceText, file: selectedSource }}
      loadingInbox={isLoadingInbox}
      result={result}
      analyzing={isAnalyzing}
      saving={isSaving}
      error={error}
      offline={isOffline}
      onClose={goBackOrHome}
      onInputChange={(input) => {
        setSourceText(input.text);
        setSelectedSource(input.file);
      }}
      onChooseDocument={chooseDocument}
      onAnalyze={analyze}
      onConfirm={confirm}
      onSelectTrip={(selectedTripId) => {
        const pending = activePending;
        router.replace(pending ? `/(app)/imports?tripId=${selectedTripId}&pendingId=${pending.id}` : `/(app)/imports?tripId=${selectedTripId}`);
      }}
      onOpenImport={(id) => router.replace(`/(app)/imports?pendingId=${encodeURIComponent(id)}${tripId ? `&tripId=${tripId}` : ""}`)}
      onOpenDocuments={() => {
        if (tripId) router.replace(`/(app)/trips/${tripId}/documents`);
      }}
      onOpenReservations={() => {
        if (tripId) router.replace(`/(app)/trips/${tripId}/reservations`);
      }}
    />
  );
}

import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import type { PlaceCandidate, ReservationDraft, Trip, UUID } from "../../../src/modules/_shared/model";
import { useTripsModule } from "../../../src/modules/trips";
import { validateImportSource, type OnDeviceAnalysisStatus, type PendingReservationImport, type ReservationImportResult } from "../../../src/modules/reservations";
import {
  analyzeReservationSource,
  OnDeviceAnalysisUnavailableError,
  type ReservationAnalysisMode,
} from "../../../src/modules/reservations/import-analysis";
import { describeAnalysisFailure, recoverPendingImport } from "../../../src/modules/reservations/import-state";
import { selectPendingImport } from "../../../src/modules/reservations/import-selection";
import { ReservationImportScreen as ReservationImportView } from "../../../src/screens/ReservationImportScreen";
import { useNaveyoBootstrap } from "../../../src/bootstrap";
import {
  applyReservationPlaceCandidate,
  clearReservationPlaceLocation,
  type ReservationPlaceCandidates,
  type ReservationPlaceKey,
} from "../../../src/modules/reservations/place-resolution";

export default function ReservationImportRoute() {
  const router = useRouter();
  const { tripId: rawTripId, pendingId: rawPendingId } = useLocalSearchParams<{ tripId?: string; pendingId?: string }>();
  const tripId = rawTripId as UUID | undefined;
  const pendingId = rawPendingId as string | undefined;
  const trips = useTripsModule();
  const bootstrap = useNaveyoBootstrap();
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
  const [pendingImports, setPendingImports] = useState<PendingReservationImport[]>([]);
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);
  const [placeCandidates, setPlaceCandidates] = useState<ReservationPlaceCandidates>({});
  const [analysisMode, setAnalysisMode] = useState<ReservationAnalysisMode | null>(null);
  const [onDeviceStatus, setOnDeviceStatus] = useState<OnDeviceAnalysisStatus | null>(null);

  useEffect(() => {
    const analyzer = bootstrap?.modules.reservationOnDeviceAnalyzer;
    if (!analyzer) return;
    let mounted = true;
    void analyzer.status().then((status) => { if (mounted) setOnDeviceStatus(status); }).catch(() => undefined);
    return () => { mounted = false; };
  }, [bootstrap]);

  useEffect(() => {
    let mounted = true;
    const loadPendingImports = async () => {
      try {
        const inbox = bootstrap?.modules.reservationImportInbox;
        if (!inbox) {
          if (mounted) setIsLoadingInbox(false);
          return;
        }
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
  }, [bootstrap, tripId, trips]);

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

  async function analyze(options: { allowRemote: boolean } = { allowRemote: false }) {
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
    setAnalysisMode(null);
    setIsAnalyzing(true);
    try {
      if (pendingId) {
        const inbox = bootstrap?.modules.reservationImportInbox;
        if (!inbox) throw new Error("L’inbox de partage n’est pas configurée");
        await inbox.updateStatus(pendingId, "processing");
        await inbox.list().then(setPendingImports);
      }
      if (selectedSource) validateImportSource(selectedSource);
      const outcome = await analyzeReservationSource({
        tripId,
        source: selectedSource
          ? { kind: "file", uri: selectedSource.uri }
          : { kind: "text", text: sourceText },
        allowRemote: options.allowRemote,
        onDevice: bootstrap?.modules.reservationOnDeviceAnalyzer,
        extractor: bootstrap?.modules.reservationTextExtractor,
        remote: bootstrap?.modules.reservationTextAnalyzer,
      });
      const draft: ReservationDraft = outcome.draft;
      setAnalysisMode(outcome.mode);
      const next = { state: "needs-confirmation" as const, draft };
      if (next.state === "needs-confirmation") {
        await resolveImportedPlaces(draft);
        const existing = await bootstrap?.modules.reservations.findDuplicate(tripId, next.draft);
        setResult(
          existing
            ? { state: "duplicate", draft: next.draft, existing }
            : next,
        );
      } else {
        setResult(next);
      }
    } catch (cause: unknown) {
      const failure = cause instanceof OnDeviceAnalysisUnavailableError
        ? { message: cause.message, isOffline: false }
        : describeAnalysisFailure(cause);
      if (pendingId) {
        const inbox = bootstrap?.modules.reservationImportInbox;
        try {
          if (inbox) {
            // Missing consent is not a failure: the import stays ready for another attempt.
            if (cause instanceof OnDeviceAnalysisUnavailableError) await inbox.updateStatus(pendingId, "seen");
            else await inbox.updateStatus(pendingId, "failed", failure.message);
            await inbox.list().then(setPendingImports);
          }
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

  async function resolveImportedPlaces(draft: ReservationDraft) {
    if (!bootstrap) return;
    const entries = (["venue", "origin", "destination"] as const)
      .map((key) => [key, draft[key]] as const)
      .filter((entry): entry is readonly [ReservationPlaceKey, NonNullable<ReservationDraft[ReservationPlaceKey]>] => Boolean(entry[1]));
    const resolved = await Promise.all(entries.map(async ([key, reference]) => {
      try {
        const reverse = reference.coordinates
          ? await bootstrap.modules.places.reverse({ coordinates: reference.coordinates, tripId })
          : null;
        const candidates = reverse
          ? [reverse]
          : await bootstrap.modules.places.search({ query: reference.label, tripId });
        return [key, candidates.slice(0, 3)] as const;
      } catch {
        return [key, []] as const;
      }
    }));
    setPlaceCandidates(Object.fromEntries(resolved));
  }

  function selectPlaceCandidate(key: ReservationPlaceKey, candidate: PlaceCandidate) {
    setResult((current) => current?.state === "needs-confirmation"
      ? { ...current, draft: applyReservationPlaceCandidate(current.draft, key, candidate) }
      : current);
  }

  function leavePlaceUnresolved(key: ReservationPlaceKey) {
    setResult((current) => current?.state === "needs-confirmation"
      ? { ...current, draft: clearReservationPlaceLocation(current.draft, key) }
      : current);
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
      if (!bootstrap) throw new Error("Les Modules du Voyage ne sont pas disponibles");
      await bootstrap.modules.reservations.confirm({
        tripId,
        draft,
        confirmedFields,
      });
      if (pendingId) {
        const inbox = bootstrap.modules.reservationImportInbox;
        try {
          if (inbox) {
            await inbox.updateStatus(pendingId, "confirmed");
            await inbox.list().then(setPendingImports);
          }
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
      router.replace('/(app)/trips');
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
      onDeviceStatus={onDeviceStatus}
      analysisMode={analysisMode}
      placeCandidates={placeCandidates}
      onPlaceCandidateSelect={selectPlaceCandidate}
      onLeavePlaceUnresolved={leavePlaceUnresolved}
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

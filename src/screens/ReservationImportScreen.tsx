import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { PendingShareImport } from "../adapters/apple-document-analysis";
import type { ReservationDraft, Trip, UUID } from "../modules/_shared/model";
import type { ReservationImportResult } from "../modules/reservations";
import { colors, radius, shadows, spacing } from "../theme";
import {
  AppText,
  Badge,
  Button,
  Checkbox,
  Icon,
  InlineMessage,
  ShellFrame,
  TextArea,
} from "../ui";
import {
  buildReservationDraftFields,
  canConfirmReservationDraft,
  confidenceLabel,
} from "./reservation-import-model";

export interface ImportFileSelection {
  uri: string;
  kind: "pdf" | "image";
  fileName?: string;
  sizeBytes?: number;
}

export interface ImportInput {
  text: string;
  file: ImportFileSelection | null;
}

export interface ReservationImportScreenProps {
  tripId?: UUID;
  trips: Trip[];
  pendingImports: PendingShareImport[];
  activePending?: PendingShareImport;
  input: ImportInput;
  loadingInbox: boolean;
  result: ReservationImportResult | null;
  analyzing: boolean;
  saving: boolean;
  error?: string | null;
  offline: boolean;
  onClose: () => void;
  onInputChange: (input: ImportInput) => void;
  onChooseDocument: () => Promise<void>;
  onAnalyze: () => Promise<void>;
  onConfirm: (draft: ReservationDraft, confirmedFields: string[]) => Promise<void>;
  onSelectTrip: (tripId: UUID) => void;
  onOpenImport: (id: string) => void;
  onOpenDocuments: () => void;
  onOpenReservations: () => void;
}

export function ReservationImportScreen({
  tripId,
  trips,
  pendingImports,
  activePending,
  input,
  loadingInbox,
  result,
  analyzing,
  saving,
  error,
  offline,
  onClose,
  onInputChange,
  onChooseDocument,
  onAnalyze,
  onConfirm,
  onSelectTrip,
  onOpenImport,
  onOpenDocuments,
  onOpenReservations,
}: ReservationImportScreenProps) {
  return (
    <ShellFrame
      title="Imports & réservations"
      subtitle="Ajoutez une confirmation, relisez chaque donnée, puis enregistrez-la dans le Voyage."
      headerAction={<Button size="sm" variant="secondary" onPress={onClose}>Fermer</Button>}
    >
      <View style={styles.tabs} accessibilityRole="tablist">
        <View style={styles.activeTab} accessibilityRole="tab" accessibilityState={{ selected: true }}>
          <AppText variant="label" color="onAccent">Importer</AppText>
        </View>
        <Pressable
          disabled={!tripId}
          onPress={onOpenDocuments}
          style={styles.inactiveTab}
          accessibilityRole="tab"
          accessibilityState={{ disabled: !tripId }}
        >
          <AppText variant="label" color="muted">Documents</AppText>
        </Pressable>
        <Pressable
          disabled={!tripId}
          onPress={onOpenReservations}
          style={styles.inactiveTab}
          accessibilityRole="tab"
          accessibilityState={{ disabled: !tripId }}
        >
          <AppText variant="label" color="muted">Réservations</AppText>
        </Pressable>
      </View>

      {offline ? (
        <InlineMessage
          variant="info"
          title="Mode hors ligne"
          message="Les imports reçus restent sur cet appareil. L’analyse reprendra au retour de la connexion."
        />
      ) : null}
      {error ? (
        <InlineMessage variant="error" title="Import impossible" message={error} />
      ) : null}

      {!tripId ? (
        <TripPicker trips={trips} pending={activePending} onSelect={onSelectTrip} />
      ) : (
        <ImportComposer
          input={input}
          analyzing={analyzing}
          onChange={onInputChange}
          onChooseDocument={onChooseDocument}
          onAnalyze={onAnalyze}
        />
      )}

      {result?.state === "error" ? (
        <InlineMessage variant="error" title="Brouillon invalide" message={result.message} />
      ) : null}
      {result?.state === "duplicate" ? (
        <View style={styles.panel}>
          <InlineMessage
            variant="info"
            title="Réservation déjà importée"
            message={`Cette confirmation correspond à « ${result.existing.title} ». Rien n’a été modifié.`}
          />
          <Button fullWidth variant="secondary" onPress={onOpenReservations}>
            Voir les réservations
          </Button>
        </View>
      ) : null}
      {result?.state === "needs-confirmation" ? (
        <DraftConfirmation
          draft={result.draft}
          saving={saving}
          onConfirm={onConfirm}
        />
      ) : null}

      <ImportCenter
        items={pendingImports}
        loading={loadingInbox}
        tripSelected={Boolean(tripId)}
        onOpen={onOpenImport}
      />

      <View style={styles.privacyNote}>
        <Icon name="info" size={20} color={colors.teal} />
        <AppText variant="caption" color="muted" style={styles.flexText}>
          PDFKit et Vision extraient d’abord le texte sur l’iPhone. Le document original n’est pas envoyé à l’analyse distante et aucune donnée n’est confirmée automatiquement.
        </AppText>
      </View>

      <ComingSoonSection />
    </ShellFrame>
  );
}

function ImportComposer({
  input,
  analyzing,
  onChange,
  onChooseDocument,
  onAnalyze,
}: {
  input: ImportInput;
  analyzing: boolean;
  onChange: (input: ImportInput) => void;
  onChooseDocument: () => Promise<void>;
  onAnalyze: () => Promise<void>;
}) {
  const hasSource = Boolean(input.file || input.text.trim());
  const [remoteAnalysisConsent, setRemoteAnalysisConsent] = useState(false);
  return (
    <View style={styles.panel}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}>
          <Icon name="file-text" size={22} color={colors.accent} />
        </View>
        <View style={styles.flexText}>
          <AppText variant="h3">Nouvelle confirmation</AppText>
          <AppText variant="caption" color="muted">Un partage produit une seule Réservation.</AppText>
        </View>
        <Badge label="V0" variant="accent" />
      </View>

      <View style={styles.dropZone}>
        <Icon name={input.file?.kind === "image" ? "image" : "file-text"} size={32} color={colors.accent} />
        <AppText variant="label" align="center">
          {input.file?.fileName ?? (input.file ? "Document partagé" : "PDF, JPEG ou PNG")}
        </AppText>
        <AppText variant="caption" color="muted" align="center">25 Mo et 50 pages maximum</AppText>
        <Button variant="secondary" onPress={() => void onChooseDocument()}>
          Choisir dans Fichiers ou Photos
        </Button>
      </View>

      <View style={styles.orRow}>
        <View style={styles.divider} />
        <AppText variant="caption" color="muted">OU COLLER DU TEXTE</AppText>
        <View style={styles.divider} />
      </View>
      <TextArea
        label="Contenu de la confirmation"
        value={input.text}
        onChangeText={(text) => onChange({ text, file: null })}
        placeholder="Collez le contenu d’un e-mail, d’un lien ou d’un événement ICS…"
        autoCapitalize="none"
        maxLength={20_000}
      />
      <AppText variant="caption" color="muted">
        Une URL authentifiée est conservée comme lien et n’est jamais scrapée.
      </AppText>
      <View style={styles.consentBox}>
        <Checkbox
          checked={remoteAnalysisConsent}
          label="J’autorise l’envoi du texte extrait à OpenCode Go"
          onChange={setRemoteAnalysisConsent}
        />
        <AppText variant="caption" color="muted" style={styles.consentDetail}>
          Le texte utile est transmis à OpenCode Go via l’Edge Function Supabase de Naveyo. Le PDF ou l’image d’origine reste sur l’iPhone.
        </AppText>
      </View>
      <Button
        fullWidth
        loading={analyzing}
        disabled={!hasSource || !remoteAnalysisConsent || analyzing}
        onPress={() => void onAnalyze()}
      >
        Analyser le brouillon
      </Button>
    </View>
  );
}

function TripPicker({
  trips,
  pending,
  onSelect,
}: {
  trips: Trip[];
  pending?: PendingShareImport;
  onSelect: (tripId: UUID) => void;
}) {
  return (
    <View style={styles.panel}>
      <Badge label="NOUVEL IMPORT" variant="teal" />
      <AppText variant="h3">Associer au Voyage</AppText>
      <AppText variant="bodySmall" color="muted">
        {pending
          ? `Document en attente : ${pending.fileName ?? "texte partagé"}`
          : "Choisissez le Voyage auquel rattacher cette confirmation."}
      </AppText>
      {trips.length === 0 ? (
        <InlineMessage
          variant="info"
          title="Aucun Voyage disponible"
          message="Créez ou rejoignez un Voyage avant d’importer cette réservation."
        />
      ) : null}
      {trips.map((trip) => (
        <Button key={trip.id} fullWidth variant="secondary" onPress={() => onSelect(trip.id)}>
          {trip.name}
        </Button>
      ))}
    </View>
  );
}

function DraftConfirmation({
  draft,
  saving,
  onConfirm,
}: {
  draft: ReservationDraft;
  saving: boolean;
  onConfirm: (draft: ReservationDraft, confirmedFields: string[]) => Promise<void>;
}) {
  const fields = useMemo(() => buildReservationDraftFields(draft), [draft]);
  const [confirmedFields, setConfirmedFields] = useState<Set<string>>(() => new Set());
  const ready = canConfirmReservationDraft(draft, fields, confirmedFields);

  const toggle = (key: string, checked: boolean) => {
    setConfirmedFields((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  return (
    <View style={styles.confirmationCard}>
      <View style={styles.sectionHeading}>
        <View style={styles.confirmIcon}>
          <Icon name="check" size={22} color={colors.success} />
        </View>
        <View style={styles.flexText}>
          <AppText variant="h3">Relire le brouillon</AppText>
          <AppText variant="caption" color="muted">{confidenceLabel(draft.confidence)}</AppText>
        </View>
        <Badge label="À CONFIRMER" variant="teal" />
      </View>
      <InlineMessage
        variant="info"
        title="Validation champ par champ"
        message="Cochez uniquement une donnée après l’avoir comparée à la confirmation d’origine. Rien n’est présélectionné."
      />
      <View style={styles.fieldList}>
        {fields.map((field) => (
          <View key={field.key} style={styles.fieldRow}>
            <Checkbox
              checked={confirmedFields.has(field.key)}
              label={field.label}
              onChange={(checked) => toggle(field.key, checked)}
              style={styles.fieldCheckbox}
            />
            <AppText variant="bodySmall" color={field.value === "À préciser" ? "danger" : "fg"} style={styles.fieldValue}>
              {field.value}
            </AppText>
          </View>
        ))}
      </View>
      {!draft.type || !draft.title?.trim() ? (
        <InlineMessage
          variant="error"
          title="Brouillon incomplet"
          message="Le type et l’intitulé doivent être détectés avant l’enregistrement. Relancez l’analyse avec un document plus lisible."
        />
      ) : null}
      <Button
        fullWidth
        loading={saving}
        disabled={!ready || saving}
        onPress={() => void onConfirm(draft, [...confirmedFields])}
      >
        Confirmer la réservation
      </Button>
      <AppText variant="caption" color="muted" align="center">
        {confirmedFields.size}/{fields.length} champs relus
      </AppText>
    </View>
  );
}

function ImportCenter({
  items,
  loading,
  tripSelected,
  onOpen,
}: {
  items: PendingShareImport[];
  loading: boolean;
  tripSelected: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionTitleRow}>
        <AppText variant="h3">Centre d’import</AppText>
        <Badge label={`${items.filter((item) => item.status !== "confirmed").length} en attente`} variant="gold" />
      </View>
      {loading ? (
        <InlineMessage variant="info" title="Chargement des imports" message="Lecture de la boîte de réception privée…" />
      ) : items.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Icon name="file-text" size={32} color={colors.muted} />
          <AppText variant="label">Aucun document partagé</AppText>
          <AppText variant="caption" color="muted" align="center">Les prochains imports depuis Mail, Safari, Fichiers ou Photos apparaîtront ici.</AppText>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.importRow}>
            <View style={[styles.fileIcon, item.status === "failed" && styles.fileIconError]}>
              <Icon name={item.mimeType?.startsWith("image/") ? "image" : "file-text"} size={22} color={item.status === "failed" ? colors.danger : colors.accent} />
            </View>
            <View style={styles.flexText}>
              <AppText variant="label" numberOfLines={1}>{item.fileName ?? "Texte partagé"}</AppText>
              <AppText variant="caption" color={item.status === "failed" ? "danger" : "muted"}>
                {importStatusLabel(item.status)}
              </AppText>
              {item.error ? <AppText variant="caption" color="danger" numberOfLines={2}>{item.error}</AppText> : null}
            </View>
            {item.status !== "confirmed" ? (
              <Button size="sm" variant="secondary" onPress={() => onOpen(item.id)}>
                {tripSelected ? "Ouvrir" : "Associer"}
              </Button>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

function importStatusLabel(status: PendingShareImport["status"]): string {
  if (status === "confirmed") return "Réservation confirmée";
  if (status === "failed") return "Analyse échouée · vous pouvez réessayer";
  if (status === "processing") return "Analyse en cours";
  return "À traiter";
}

function ComingSoonSection() {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionTitleRow}>
        <AppText variant="h3">Préparer le Voyage</AppText>
        <Badge label="À venir" variant="gold" />
      </View>
      <View accessible accessibilityLabel="Fonctions de préparation à venir" accessibilityState={{ disabled: true }} style={styles.comingSoonList}>
        <View style={styles.comingSoonRow}>
          <Icon name="check" size={22} color={colors.muted} />
          <View style={styles.flexText}>
            <AppText variant="label" color="muted">Checklist et packing list</AppText>
            <AppText variant="caption" color="muted">Listes collaboratives et assignations</AppText>
          </View>
          <Badge label="À venir" variant="gold" />
        </View>
        <View style={styles.comingSoonRow}>
          <Icon name="search" size={22} color={colors.muted} />
          <View style={styles.flexText}>
            <AppText variant="label" color="muted">Comparateurs et réservations intégrées</AppText>
            <AppText variant="caption" color="muted">Vols, hôtels, voiture et activités</AppText>
          </View>
          <Badge label="À venir" variant="gold" />
        </View>
        <View style={styles.comingSoonRow}>
          <Icon name="settings" size={22} color={colors.muted} />
          <View style={styles.flexText}>
            <AppText variant="label" color="muted">eSIM et connectivité</AppText>
            <AppText variant="caption" color="muted">Offres partenaires et configuration APN</AppText>
          </View>
          <Badge label="À venir" variant="gold" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", alignItems: "center", padding: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  activeTab: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: colors.accent },
  inactiveTab: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", opacity: 0.58 },
  panel: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.sm },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  sectionIcon: { width: 44, height: 44, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft },
  confirmIcon: { width: 44, height: 44, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealSoft },
  flexText: { flex: 1 },
  dropZone: { minHeight: 190, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.border, backgroundColor: colors.bg },
  orRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  privacyNote: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tealSoft },
  consentBox: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.bg },
  consentDetail: { paddingLeft: spacing.xl },
  confirmationCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.teal, backgroundColor: colors.surface, ...shadows.md },
  fieldList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  fieldRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  fieldCheckbox: { minHeight: 36 },
  fieldValue: { paddingLeft: spacing.xl },
  sectionBlock: { gap: spacing.md },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  emptyCenter: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  importRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  fileIcon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft },
  fileIconError: { backgroundColor: colors.goldSoft },
  comingSoonList: { gap: spacing.sm, opacity: 0.56 },
  comingSoonRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
});

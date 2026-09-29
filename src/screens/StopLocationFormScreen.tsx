import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Location from "expo-location";
import { useNaveyoBootstrap } from "../bootstrap";
import type { PlaceCandidate, Stop, UUID } from "../modules/_shared/model";
import { colors, radius, spacing } from "../theme";
import { AppText, Button, DatePickerField, Input, ShellFrame, StatusPanel } from "../ui";
import { describePlacesError } from "./places-error";

export interface StopLocationFormScreenProps {
  tripId: UUID;
  initialStop?: Stop;
  onSaved: () => void;
  onCancel: () => void;
}

/** Shared create/edit form. Provider results are deliberately only applied after selection. */
export function StopLocationFormScreen({ tripId, initialStop, onSaved, onCancel }: StopLocationFormScreenProps) {
  const bootstrap = useNaveyoBootstrap();
  const trips = bootstrap?.modules.trips;
  const places = bootstrap?.modules.places;
  const [name, setName] = useState(initialStop?.name ?? "");
  const [countryCode, setCountryCode] = useState(initialStop?.countryCode ?? "");
  const [timeZone, setTimeZone] = useState(initialStop?.timeZone ?? "Europe/Paris");
  const [startDate, setStartDate] = useState(initialStop?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialStop?.endDate ?? "");
  const [selected, setSelected] = useState<PlaceCandidate | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const query = name.trim();
    if (!places || query.length < 2 || selected?.name === query || query === initialStop?.name) return;
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      setSearching(true);
      setError(null);
      void places.autocomplete({ query, tripId, countryCode: countryCode.trim() || undefined, type: "city", limit: 5 }).then((results) => {
        if (id === requestId.current) setSuggestions(results.slice(0, 5));
      }).catch((cause: unknown) => {
        if (id === requestId.current) { setSuggestions([]); setError(describePlacesError(cause)); }
      }).finally(() => { if (id === requestId.current) setSearching(false); });
    }, 350);
    return () => clearTimeout(timer);
  }, [countryCode, initialStop?.name, name, places, selected?.name, tripId]);

  const choose = (candidate: PlaceCandidate) => {
    setSelected(candidate);
    setName(candidate.name);
    if (candidate.countryCode) setCountryCode(candidate.countryCode);
    setSuggestions([]);
    // Geoapify's normalized candidate may expose a timezone in newer contracts.
    const candidateTimeZone = (candidate as PlaceCandidate & { timeZone?: string }).timeZone;
    if (candidateTimeZone) setTimeZone(candidateTimeZone);
  };

  const requestCurrentPosition = async () => {
    if (!places) return;
    setLocating(true); setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) throw new Error("Permission de localisation refusée");
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const candidate = await places.reverse({ tripId, coordinates: { latitude: position.coords.latitude, longitude: position.coords.longitude } });
      if (!candidate) throw new Error("Aucun lieu trouvé à cette position");
      choose(candidate);
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : "";
      setError(/^(Permission|Aucun lieu)/.test(message) ? message : "Position indisponible. Réessayez ou saisissez la ville.");
    } finally { setLocating(false); }
  };

  const submit = async () => {
    if (!trips || !name.trim()) return;
    if (!startDate || !endDate) { setError("Choisissez les dates de début et de fin."); return; }
    if (endDate < startDate) { setError("La date de fin doit suivre la date de début."); return; }
    setSaving(true); setError(null);
    try {
      const input = { tripId, name: name.trim(), countryCode: countryCode.trim().toUpperCase(), timeZone: timeZone.trim() as Stop["timeZone"], startDate, endDate };
      const nameChanged = initialStop !== undefined && input.name !== initialStop.name;
      // A renamed Étape must not keep the previous city's coordinates, address or photo.
      const location = selected
        ? { coordinates: selected.coordinates, providerPlaceId: selected.providerPlaceId ?? null, address: selected.address ?? null, imageUrl: selected.imageUrl ?? null, attribution: selected.attribution ?? null }
        : nameChanged
          ? { coordinates: null, providerPlaceId: null, address: null, imageUrl: null, attribution: null }
          : {};
      const enriched = { ...input, ...location };
      const updateStop = trips.updateStop?.bind(trips);
      if (initialStop) {
        if (!updateStop) throw new Error("La modification des Étapes n'est pas encore disponible");
        const { tripId: _tripId, ...changes } = enriched;
        void _tripId;
        await updateStop(initialStop.id, changes as Partial<Omit<Stop, "id" | "tripId">>);
      } else await trips.createStop(enriched as Omit<Stop, "id">);
      onSaved();
    } catch (cause: unknown) { setError(describeStopSaveError(cause)); }
    finally { setSaving(false); }
  };

  return <ShellFrame title={initialStop ? "Modifier l’Étape" : "Nouvelle Étape"} subtitle="Recherchez une ville pour obtenir ses coordonnées et son fuseau.">
    <Input label="Ville ou lieu" value={name} onChangeText={(value) => { setName(value); setSelected(null); }} placeholder="Lisbonne" autoCorrect={false} />
    {searching ? <AppText variant="caption" color="muted">Recherche…</AppText> : null}
    {suggestions.length > 0 ? <View style={styles.suggestions}>{suggestions.map((candidate) => <Pressable key={candidate.id} onPress={() => choose(candidate)} style={styles.suggestion} accessibilityRole="button"><AppText variant="label">{candidate.name}</AppText><AppText variant="caption" color="muted">{candidate.address ?? candidate.countryCode ?? ""}</AppText></Pressable>)}</View> : null}
    <Button fullWidth variant="secondary" loading={locating} onPress={() => void requestCurrentPosition()}>Utiliser ma position</Button>
    {selected ? <View style={styles.confirmed}><AppText variant="caption" color="muted">Localisation sélectionnée</AppText><AppText variant="label">{selected.coordinates.latitude.toFixed(5)}, {selected.coordinates.longitude.toFixed(5)}</AppText></View> : null}
    <Input label="Pays (ISO 3166-1 alpha-2)" value={countryCode} onChangeText={setCountryCode} placeholder="PT" autoCapitalize="characters" maxLength={2} />
    <Input label="Fuseau IANA" value={timeZone} onChangeText={setTimeZone} placeholder="Europe/Lisbon" />
    <DatePickerField label="Date de début" value={startDate} onChange={(value) => { setStartDate(value); if (endDate && endDate < value) setEndDate(""); }} />
    <DatePickerField label="Date de fin" value={endDate} onChange={setEndDate} minimumDate={startDate || undefined} />
    {error ? <StatusPanel kind="error" title="Impossible d’enregistrer l’Étape" message={error} /> : null}
    <Button fullWidth loading={saving} disabled={!trips || !name.trim()} onPress={() => void submit()}>{initialStop ? "Enregistrer les modifications" : "Ajouter l’Étape"}</Button>
    <Button fullWidth variant="secondary" onPress={onCancel}>Annuler</Button>
  </ShellFrame>;
}

function describeStopSaveError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : "";
  if (/42501|not allowed/i.test(message)) return "Vous n’avez pas le droit de modifier cette Étape.";
  if (/23505|duplicate/i.test(message)) return "Une autre Étape vient d’être ajoutée. Réessayez.";
  if (/Invalid stop|check constraint|23514/i.test(message)) return "Vérifiez la ville, le pays (2 lettres), le fuseau et les dates.";
  if (message.startsWith("La modification")) return message;
  return "Impossible d’enregistrer l’Étape. Réessayez.";
}

const styles = StyleSheet.create({ suggestions: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginTop: -spacing.sm }, suggestion: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, confirmed: { padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.accentSoft, gap: 4 } });

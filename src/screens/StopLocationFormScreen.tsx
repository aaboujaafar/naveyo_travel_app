import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Location from "expo-location";
import { useNaveyoBootstrap } from "../bootstrap";
import type { PlaceCandidate, Stop, UUID } from "../modules/_shared/model";
import { colors, radius, spacing } from "../theme";
import { AppText, Button, DatePickerField, Icon, IconButton, Input, ShellFrame, StatusPanel } from "../ui";
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
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [tripDates, setTripDates] = useState<{ startsOn?: string; endsOn?: string }>({});
  const requestId = useRef(0);

  // A new Étape covers the whole Voyage by default; its dates stay within the Voyage.
  useEffect(() => {
    if (!trips) return;
    let cancelled = false;
    void trips.get(tripId).then((trip) => {
      if (cancelled || !trip) return;
      setTripDates({ startsOn: trip.startsOn, endsOn: trip.endsOn });
      if (!initialStop) {
        setStartDate((current) => current || trip.startsOn || "");
        setEndDate((current) => current || trip.endsOn || "");
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [initialStop, tripId, trips]);

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

  const locationSummary = countryCode.trim() || selected
    ? describeStopLocation(countryCode, timeZone)
    : "Retrouvés dès que vous choisissez une ville";

  return <ShellFrame
    title={initialStop ? "Modifier l’Étape" : "Nouvelle Étape"}
    subtitle="Choisissez une ville : le pays et l’heure locale sont retrouvés automatiquement."
    leading={<IconButton icon={<Icon name="arrow-left" size={20} />} onPress={onCancel} accessibilityLabel="Retour" />}
  >
    <Input label="Ville" value={name} onChangeText={(value) => { setName(value); setSelected(null); }} placeholder="Lisbonne" autoCorrect={false} leftIcon={<Icon name="search" size={20} color={colors.muted} />} />
    {searching ? <AppText variant="caption" color="muted">Recherche…</AppText> : null}
    {suggestions.length > 0 ? <View style={styles.suggestions}>{suggestions.map((candidate) => <Pressable key={candidate.id} onPress={() => choose(candidate)} style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${candidate.name}, ${candidate.address ?? candidate.countryCode ?? ""}`}><Icon name="map-pin" size={20} color={colors.muted} /><View style={styles.flexOne}><AppText variant="label">{candidate.name}</AppText><AppText variant="caption" color="muted" numberOfLines={1}>{candidate.address ?? candidate.countryCode ?? ""}</AppText></View></Pressable>)}</View> : null}
    {selected ? <View style={styles.confirmed}><Icon name="map-pin" size={20} color={colors.accentStrong} /><View style={styles.flexOne}><AppText variant="label">{selected.name}</AppText><AppText variant="caption" color="muted">{locationSummary}</AppText></View><Icon name="check" size={20} color={colors.accentStrong} /></View> : <Button variant="ghost" loading={locating} onPress={() => void requestCurrentPosition()} icon={<Icon name="map-pin" size={20} color={colors.accentStrong} />}>Utiliser ma position</Button>}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: showLocationDetails }} onPress={() => setShowLocationDetails((current) => !current)} style={({ pressed }) => [styles.detailsToggle, pressed && styles.pressed]}>
      <View style={styles.flexOne}><AppText variant="label">Pays et fuseau horaire</AppText>{selected ? null : <AppText variant="caption" color="muted">{locationSummary}</AppText>}</View>
      <AppText variant="label" color="accent">{showLocationDetails ? "Masquer" : "Modifier"}</AppText>
    </Pressable>
    {showLocationDetails ? <>
      <Input label="Pays (code à 2 lettres)" value={countryCode} onChangeText={setCountryCode} placeholder="PT" autoCapitalize="characters" maxLength={2} />
      <Input label="Fuseau horaire" value={timeZone} onChangeText={setTimeZone} placeholder="Europe/Lisbon" autoCapitalize="none" autoCorrect={false} />
    </> : null}
    <DatePickerField label="Arrivée" value={startDate} minimumDate={tripDates.startsOn} maximumDate={tripDates.endsOn} onChange={(value) => { setError(null); setStartDate(value); if (endDate && endDate < value) setEndDate(""); }} />
    <DatePickerField label="Départ" value={endDate} onChange={(value) => { setError(null); setEndDate(value); }} minimumDate={startDate || tripDates.startsOn} maximumDate={tripDates.endsOn} />
    {tripDates.startsOn && tripDates.endsOn ? <AppText variant="caption" color="muted">Seules les dates du Voyage sont proposées.</AppText> : null}
    {error ? <StatusPanel kind="error" title="Impossible d’enregistrer l’Étape" message={error} /> : null}
    <Button fullWidth loading={saving} disabled={!trips || !name.trim() || !startDate || !endDate} onPress={() => void submit()}>{initialStop ? "Enregistrer les modifications" : name.trim() ? `Ajouter ${name.trim()}` : "Ajouter l’Étape"}</Button>
  </ShellFrame>;
}

/** "Portugal · heure de Lisbon", readable without knowing ISO or IANA codes. */
export function describeStopLocation(countryCode: string, timeZone: string): string {
  const code = countryCode.trim().toUpperCase();
  const zone = timeZone.trim();
  let country = code;
  try {
    // Hermes may ship without Intl.DisplayNames; the code stays readable then.
    const names = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["fr"], { type: "region" }) : null;
    country = (code.length === 2 ? names?.of(code) : undefined) ?? code;
  } catch {
    country = code;
  }
  const city = zone.split("/").pop()?.replace(/_/g, " ");
  const parts = [country || "Pays à préciser", city ? `heure de ${city}` : "fuseau à préciser"];
  return parts.join(" · ");
}

function describeStopSaveError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : "";
  if (/42501|not allowed/i.test(message)) return "Vous n’avez pas le droit de modifier cette Étape.";
  if (/23505|duplicate/i.test(message)) return "Une autre Étape vient d’être ajoutée. Réessayez.";
  if (/Invalid stop|check constraint|23514/i.test(message)) return "Vérifiez la ville, le pays (2 lettres), le fuseau et les dates.";
  if (message.startsWith("La modification")) return message;
  return "Impossible d’enregistrer l’Étape. Réessayez.";
}

const styles = StyleSheet.create({
  suggestions: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginTop: -spacing.sm },
  suggestion: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  confirmed: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.accentSoft },
  detailsToggle: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  flexOne: { flex: 1 },
  pressed: { opacity: 0.78 },
});

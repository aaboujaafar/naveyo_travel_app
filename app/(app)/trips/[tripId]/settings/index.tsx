import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useNaveyoBootstrap } from "../../../../../src/bootstrap";
import { effectiveDeparture, type CityRef, type TravelParty } from "../../../../../src/modules/trip-profiles";
import type { Trip } from "../../../../../src/modules/_shared/model";
import { useTripsModule } from "../../../../../src/modules/trips";
import { TripSettingsScreen } from "../../../../../src/screens/TripSettingsScreen";
import {
  normalizeTripSettings,
  type TripSettingsValues,
} from "../../../../../src/screens/trip-settings-model";

export default function TripSettingsRoute() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const trips = useTripsModule();
  const bootstrap = useNaveyoBootstrap();
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [party, setParty] = useState<TravelParty | null>(null);
  const [tripDeparture, setTripDeparture] = useState<CityRef | null>(null);
  const [homeCity, setHomeCity] = useState<CityRef | null>(null);
  const [partyStatus, setPartyStatus] = useState({ saving: false, error: null as string | null, message: null as string | null });
  const [trip, setTrip] = useState<Trip | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!trips || !tripId) return;
    let active = true;
    trips
      .get(tripId as Trip["id"])
      .then((loaded) => {
        if (active) setTrip(loaded);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger le Voyage",
          );
        }
      });
    const profiles = bootstrap?.modules.tripProfiles;
    if (profiles && tripId) {
      void Promise.all([
        profiles.listMembers(tripId as Trip["id"]).catch(() => []),
        profiles.getParty(tripId as Trip["id"]).catch(() => null),
        bootstrap.modules.identity.currentAccount().catch(() => null),
        profiles.getDeparture(tripId as Trip["id"]).catch(() => null),
        profiles.myProfile().catch(() => null),
      ]).then(([members, loadedParty, account, departure, profile]) => {
        if (!active) return;
        setTripDeparture(departure);
        setHomeCity(profile?.homeCity ?? null);
        setMemberNames(Object.fromEntries(members.flatMap((member) => (member.displayName ? [[member.accountId, member.displayName]] : []))));
        setParty(loadedParty);
        setCurrentAccountId(account?.id ?? null);
      });
    }
    return () => {
      active = false;
    };
  }, [bootstrap, trips, tripId]);

  const updateTrip = async (values: TripSettingsValues) => {
    if (!trips || !tripId) {
      setError("Le Module Voyages est indisponible.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await trips.update(
        tripId as Trip["id"],
        normalizeTripSettings(values),
      );
      setTrip(updated);
      setMessage("Les informations du Voyage ont été mises à jour.");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Modification impossible",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <TripSettingsScreen
      key={trip?.id ?? "loading"}
      trip={trip}
      saving={saving}
      message={message}
      error={error}
      onBack={() => router.back()}
      onSave={updateTrip}
      memberNames={memberNames}
      currentAccountId={currentAccountId}
      party={party}
      partyStatus={partyStatus}
      onSaveParty={bootstrap?.modules.tripProfiles ? async (next) => {
        const profiles = bootstrap.modules.tripProfiles;
        if (!profiles || !tripId) return;
        setPartyStatus({ saving: true, error: null, message: null });
        try {
          await profiles.saveParty(tripId as Trip["id"], next);
          setParty(next);
          setPartyStatus({ saving: false, error: null, message: "L’IA en tiendra compte pour les prochaines journées composées." });
        } catch (cause) {
          setPartyStatus({ saving: false, error: cause instanceof Error ? cause.message : "Enregistrement impossible.", message: null });
        }
      } : undefined}
      departure={effectiveDeparture(tripDeparture, homeCity)}
      departureIsDefault={!tripDeparture && Boolean(homeCity)}
      onSaveDeparture={bootstrap?.modules.tripProfiles && tripId ? async (city) => {
        await bootstrap.modules.tripProfiles?.saveDeparture(tripId as Trip["id"], city);
        setTripDeparture(city);
      } : undefined}
      onOpenInvitation={() => {
        if (tripId) router.push(`/(app)/trips/${tripId}/invite`);
      }}
    />
  );
}

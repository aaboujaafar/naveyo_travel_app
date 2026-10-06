import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useNaveyoBootstrap } from "../../src/bootstrap";
import type { OfflineTripPackLoad } from "../../src/modules/offline-trip-pack";
import { useTripsModule, type Trip } from "../../src/modules/trips";
import { AccountScreen } from "../../src/screens/AccountScreen";
import type { CityRef } from "../../src/modules/trip-profiles";
import { useShellSession } from "../../src/ui";
import { currentTripForAccount } from "../../src/screens/account-screen-model";

export default function AccountRoute() {
  const router = useRouter();
  const { account, signOut } = useShellSession();
  const tripsModule = useTripsModule();
  const bootstrap = useNaveyoBootstrap();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [countryCount, setCountryCount] = useState(0);
  const [offline, setOffline] = useState<OfflineTripPackLoad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [displayName, setDisplayName] = useState<string | undefined>();
  const [homeCity, setHomeCity] = useState<CityRef | null>(null);
  const [nationality, setNationality] = useState<string | undefined>();

  useEffect(() => {
    if (!tripsModule || !bootstrap) return;
    let active = true;
    tripsModule
      .list()
      .then(async (nextTrips) => {
        const stopsByTrip = await Promise.all(
          nextTrips.map((trip) => tripsModule.listStops(trip.id)),
        );
        const countries = new Set(
          stopsByTrip.flat().map((stop) => stop.countryCode),
        );
        const currentTrip = currentTripForAccount(nextTrips);
        const nextOffline = currentTrip
          ? await bootstrap.modules.offlineTripPack.load(currentTrip.id)
          : null;
        if (!active) return;
        setTrips(nextTrips);
        setCountryCount(countries.size);
        setOffline(nextOffline);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger les Voyages du Compte",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    void bootstrap.modules.tripProfiles?.myProfile().then((profile) => {
      if (!active) return;
      setDisplayName(profile?.displayName);
      setHomeCity(profile?.homeCity ?? null);
      setNationality(profile?.nationality);
    }, () => undefined);
    return () => {
      active = false;
    };
  }, [bootstrap, tripsModule]);

  const changeAccount = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AccountScreen
      account={account}
      trips={trips}
      countryCount={countryCount}
      offline={offline}
      version={Constants.expoConfig?.version ?? "0.1.0"}
      loading={loading}
      error={error}
      signingOut={signingOut}
      onBack={() => router.back()}
      onOpenTrip={(tripId) => router.push(`/trips/${tripId}`)}
      onOpenTripSettings={(tripId) =>
        router.push(`/(app)/trips/${tripId}/settings`)
      }
      onOpenInvitation={(tripId) =>
        router.push(`/(app)/trips/${tripId}/invite`)
      }
      onOpenExpenses={(tripId) =>
        router.push(`/(app)/trips/${tripId}/expenses`)
      }
      onOpenRecap={(tripId) =>
        router.push(`/(app)/trips/${tripId}/recap`)
      }
      displayName={displayName}
      onRename={bootstrap?.modules.tripProfiles ? async (name) => {
        await bootstrap.modules.tripProfiles?.updateMyDisplayName(name);
        setDisplayName(name.trim());
      } : undefined}
      homeCity={homeCity}
      nationality={nationality}
      onSaveNationality={bootstrap?.modules.tripProfiles ? async (code) => {
        await bootstrap.modules.tripProfiles?.updateMyNationality(code);
        setNationality(code ?? undefined);
      } : undefined}
      searchTripId={(currentTripForAccount(trips) ?? trips[0])?.id}
      onSaveHomeCity={bootstrap?.modules.tripProfiles ? async (city) => {
        await bootstrap.modules.tripProfiles?.updateMyHomeCity(city);
        setHomeCity(city);
      } : undefined}
      onSignOut={changeAccount}
    />
  );
}

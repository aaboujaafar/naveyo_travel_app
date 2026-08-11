import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Share } from "react-native";
import { useTripsModule } from "../../../../src/modules/trips";
import type { Trip, TripInvitation } from "../../../../src/modules/_shared/model";
import { InviteFamilyScreen } from "../../../../src/screens/InviteFamilyScreen";

export default function TripInviteScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const trips = useTripsModule();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [invitation, setInvitation] = useState<TripInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!trips || !tripId) return;
    let active = true;
    trips
      .get(tripId as Trip["id"])
      .then((nextTrip) => {
        if (active) setTrip(nextTrip);
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
    return () => {
      active = false;
    };
  }, [tripId, trips]);

  const createInvitation = async (email: string) => {
    if (!trips || !tripId) {
      setError("Le Module Voyages est indisponible.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const nextInvitation = await trips.createInvitation({
        tripId: tripId as Trip["id"],
        email,
      });
      setInvitation(nextInvitation);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de créer l’invitation",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <InviteFamilyScreen
      members={trip?.members ?? []}
      invitation={invitation}
      loading={creating}
      error={error}
      onBack={() => router.back()}
      onInvite={createInvitation}
      onShareInvitation={async (deepLink) => {
        await Share.share({
          message: `Rejoins mon Voyage Naveyo : ${deepLink}`,
          url: deepLink,
        });
      }}
      onContinue={() => {
        if (tripId) router.replace(`/(app)/trips/${tripId}`);
        else router.back();
      }}
    />
  );
}

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useNaveyoBootstrap } from "../../../../src/bootstrap";
import { useTripsModule } from "../../../../src/modules/trips";
import type { Trip, TripInvitation } from "../../../../src/modules/_shared/model";
import type { InvitationShareChannel } from "../../../../src/modules/invitation-sharing";
import { InviteFamilyScreen } from "../../../../src/screens/InviteFamilyScreen";
import { buildInvitationDeepLink } from "../../../../src/screens/invite-family-model";

export default function TripInviteScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const bootstrap = useNaveyoBootstrap();
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
      onShareInvitation={async (channel: InvitationShareChannel) => {
        if (!invitation || !bootstrap?.modules.invitationSharing) {
          setError("Le partage d’invitation est indisponible.");
          return;
        }
        setError(null);
        try {
          const result = await bootstrap.modules.invitationSharing.share({
            channel,
            tripName: trip?.name ?? "mon Voyage",
            invitationLink: buildInvitationDeepLink(invitation),
          });
          if (result.status === "unavailable") {
            setError(
              channel === "whatsapp"
                ? "WhatsApp n’est pas disponible sur cet iPhone. Utilisez Partage ou SMS."
                : "Le canal sélectionné n’est pas disponible sur cet iPhone. Utilisez Partage.",
            );
          }
        } catch {
          setError("Impossible d’ouvrir le canal de partage sélectionné.");
        }
      }}
      onContinue={() => {
        if (tripId) router.replace(`/(app)/trips/${tripId}`);
        else router.back();
      }}
    />
  );
}

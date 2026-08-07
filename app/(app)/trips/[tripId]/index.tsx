import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ShellFrame,
  StatusPanel,
} from "../../../../src/ui";
import { useTripsModule } from "../../../../src/modules/trips";
import type { Stop, Trip } from "../../../../src/modules/_shared/model";

export default function TripDetailScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const trips = useTripsModule();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!trips || !tripId) return;
    Promise.all([
      trips.get(tripId as Trip["id"]),
      trips.listStops(tripId as Trip["id"]),
    ])
      .then(([nextTrip, nextStops]) => {
        setTrip(nextTrip);
        setStops(nextStops);
      })
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Impossible de charger le Voyage",
        ),
      );
  }, [trips, tripId]);
  return (
    <ShellFrame
      title={trip?.name ?? "Voyage"}
      subtitle="Étapes et membres"
      headerAction={
        <Button
          size="sm"
          onPress={() => router.push(`/(app)/trips/${tripId}/settings`)}
        >
          Réglages
        </Button>
      }
    >
      {!trips ? (
        <StatusPanel
          kind="error"
          title="Module Trips absent"
          message="La composition Supabase doit être fournie au shell."
        />
      ) : null}
      {error ? (
        <StatusPanel
          kind="error"
          title="Chargement impossible"
          message={error}
        />
      ) : null}
      {trip ? (
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Membres du Voyage</Text>
              <Text style={styles.sectionSubtitle}>
                {trip.members.length} compte{trip.members.length > 1 ? "s" : ""} privé{trip.members.length > 1 ? "s" : ""}
              </Text>
            </View>
            <Button size="sm" onPress={() => router.push(`/(app)/trips/${tripId}/invite`)}>
              Inviter
            </Button>
          </View>
          <View style={styles.memberList}>
            {trip.members.map((member, index) => (
              <Card key={member.accountId} style={styles.memberCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{index + 1}</Text>
                </View>
                <View style={styles.memberText}>
                  <Text style={styles.memberTitle}>Compte {index + 1}</Text>
                  <Text style={styles.memberId} numberOfLines={1}>{member.accountId}</Text>
                </View>
                <Badge label={member.role === "owner" ? "PROPRIÉTAIRE" : "ÉDITEUR"} variant={member.role === "owner" ? "gold" : "teal"} />
              </Card>
            ))}
          </View>
        </View>
      ) : null}
      {stops.length === 0 ? (
        <EmptyState
          title="Aucune Étape"
          message="Ajoutez les dates locales, le pays et le fuseau IANA de la prochaine Étape."
          actionLabel="Ajouter une Étape"
          onAction={() => router.push(`/(app)/trips/${tripId}/stops/new`)}
        />
      ) : null}
      <View style={{ gap: 12 }}>
        {stops.map((stop) => (
          <Card key={stop.id} style={styles.stopCard}>
            <View style={styles.stopText}>
              <Text style={styles.stopTitle}>{stop.name}</Text>
              <Text style={styles.stopMeta}>{stop.countryCode} · {stop.timeZone}</Text>
              <Text style={styles.stopMeta}>{stop.startDate} → {stop.endDate}</Text>
            </View>
            <Button size="sm" variant="secondary" onPress={() => router.push(`/(app)/trips/${tripId}/assistant?stopId=${stop.id}`)}>
              Découvrir
            </Button>
          </Card>
        ))}
      </View>
      {stops.length > 0 ? (
        <Button
          fullWidth
          onPress={() => router.push(`/(app)/trips/${tripId}/stops/new`)}
        >
          Ajouter une Étape
        </Button>
      ) : null}
      {trip ? (
        <Button
          fullWidth
          variant="secondary"
          onPress={() => router.push(`/(app)/trips/${tripId}/tracking`)}
        >
          Trace de trajet
        </Button>
      ) : null}
    </ShellFrame>
  );
}

const styles = StyleSheet.create({
  membersSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b6b7b",
  },
  memberList: {
    gap: 10,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#edf7f7",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2a8f8f",
  },
  memberText: {
    flex: 1,
    gap: 2,
  },
  memberTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  memberId: {
    fontSize: 11,
    color: "#6b6b7b",
  },
  stopCard: {
    padding: 14,
    gap: 12,
  },
  stopText: {
    gap: 3,
  },
  stopTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  stopMeta: {
    fontSize: 13,
    color: "#6b6b7b",
  },
});

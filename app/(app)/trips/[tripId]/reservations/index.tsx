import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, EmptyState, ShellFrame, StatusPanel } from "../../../../../src/ui";
import type { Reservation, UUID } from "../../../../../src/modules/_shared/model";
import { sharedLocalReservations } from "../../../../../src/modules/reservations";
import { colors } from "../../../../../src/theme/colors";
import { spacing } from "../../../../../src/theme/spacing";
import { typography } from "../../../../../src/theme/typography";

export default function ReservationsScreen() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const tripId = rawTripId as UUID;
  const [items, setItems] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void sharedLocalReservations.list(tripId).then(setItems).catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Chargement impossible");
      });
    }, [tripId]),
  );

  return (
    <ShellFrame
      title="Réservations"
      subtitle="Les informations confirmées du Voyage."
      headerAction={
        <Button size="sm" onPress={() => router.push(`/(app)/imports?tripId=${tripId}`)}>
          Importer
        </Button>
      }
    >
      {error ? <StatusPanel kind="error" title="Chargement impossible" message={error} /> : null}
      {items.length === 0 ? (
        <EmptyState
          title="Aucune réservation"
          message="Importez une confirmation, relisez le brouillon, puis confirmez-la explicitement."
          actionLabel="Importer une confirmation"
          onAction={() => router.push(`/(app)/imports?tripId=${tripId}`)}
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <Card key={item.id} style={styles.card}>
              <View style={styles.header}>
                <Badge label={labelForType(item.type)} variant="teal" />
                <Text style={styles.title}>{item.title}</Text>
              </View>
              {item.provider ? <Text style={styles.detail}>{item.provider}</Text> : null}
              {item.reference ? <Text style={styles.detail}>Référence : {item.reference}</Text> : null}
              <LocationBlock reservation={item} />
              <Text style={styles.confirmed}>Confirmée après relecture</Text>
            </Card>
          ))}
        </View>
      )}
    </ShellFrame>
  );
}

function LocationBlock({ reservation }: { reservation: Reservation }) {
  const locations = [
    reservation.venue ? { label: "Lieu", place: reservation.venue } : null,
    reservation.origin ? { label: "Départ", place: reservation.origin } : null,
    reservation.destination ? { label: "Arrivée", place: reservation.destination } : null,
  ].filter((value): value is { label: string; place: NonNullable<Reservation["venue"]> } => value !== null);
  if (locations.length === 0) return null;
  return (
    <View style={styles.locations}>
      {locations.map(({ label, place }) => (
        <View key={`${label}-${place.label}`} style={styles.location}>
          <Text style={styles.locationText}>{label} : {place.label}</Text>
          <View style={styles.navigationButtons}>
            <Button size="sm" variant="secondary" onPress={() => void openNavigation(place, "apple")}>Plans</Button>
            <Button size="sm" variant="secondary" onPress={() => void openNavigation(place, "waze")}>Waze</Button>
          </View>
        </View>
      ))}
    </View>
  );
}

async function openNavigation(place: NonNullable<Reservation["venue"]>, provider: "apple" | "waze") {
  const query = encodeURIComponent(place.address ? `${place.label}, ${place.address}` : place.label);
  const coordinates = place.coordinates;
  const url = provider === "apple"
    ? coordinates
      ? `http://maps.apple.com/?ll=${coordinates.latitude},${coordinates.longitude}&q=${query}`
      : `http://maps.apple.com/?q=${query}`
    : coordinates
      ? `https://waze.com/ul?ll=${coordinates.latitude},${coordinates.longitude}&navigate=yes`
      : `https://waze.com/ul?q=${query}&navigate=yes`;
  await Linking.openURL(url);
}

function labelForType(type: Reservation["type"]): string {
  return {
    accommodation: "LOGEMENT",
    flight: "VOL",
    train: "TRAIN",
    ferry: "FERRY",
    activity: "ACTIVITÉ",
    other: "AUTRE",
  }[type];
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: { padding: spacing.md, gap: spacing.xs },
  header: { gap: spacing.xs },
  title: { ...typography.h3, color: colors.fg },
  detail: { ...typography.bodySmall, color: colors.muted },
  confirmed: { ...typography.caption, color: colors.teal, marginTop: spacing.xs },
  locations: { gap: spacing.sm, marginTop: spacing.sm },
  location: { gap: spacing.xs },
  locationText: { ...typography.bodySmall, color: colors.fg },
  navigationButtons: { flexDirection: "row", gap: spacing.xs },
});

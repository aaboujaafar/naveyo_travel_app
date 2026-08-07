import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, EmptyState, ShellFrame, StatusPanel } from "../../../../../src/ui";
import type { Reservation, UUID } from "../../../../../src/modules/_shared/model";
import { InMemoryReservationsModule } from "../../../../../src/modules/reservations";
import { colors } from "../../../../../src/theme/colors";
import { spacing } from "../../../../../src/theme/spacing";
import { typography } from "../../../../../src/theme/typography";

const reservations = new InMemoryReservationsModule();

export default function ReservationsScreen() {
  const router = useRouter();
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>();
  const tripId = rawTripId as UUID;
  const [items, setItems] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void reservations.list(tripId).then(setItems).catch((cause: unknown) => {
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
              <Text style={styles.confirmed}>Confirmée après relecture</Text>
            </Card>
          ))}
        </View>
      )}
    </ShellFrame>
  );
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
});

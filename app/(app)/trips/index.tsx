import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  ShellFrame,
  StatusPanel,
} from "../../../src/ui";
import { useTripsModule } from "../../../src/modules/trips";
import type { Trip } from "../../../src/modules/_shared/model";

export default function TripsIndexScreen() {
  const router = useRouter();
  const trips = useTripsModule();
  const [items, setItems] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!trips) return;
    trips
      .list()
      .then(setItems)
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Impossible de charger les Voyages",
        ),
      );
  }, [trips]);
  return (
    <ShellFrame
      title="Mes Voyages"
      subtitle="Vos espaces privés de préparation"
      headerAction={
        <Button size="sm" onPress={() => router.push("/(app)/trips/new")}>
          Nouveau
        </Button>
      }
    >
      {!trips ? (
        <StatusPanel
          kind="error"
          title="Connexion Supabase non composée"
          message="Le coordinateur doit injecter le module Trips dans le shell applicatif."
        />
      ) : null}
      {error ? (
        <StatusPanel
          kind="error"
          title="Impossible de charger les Voyages"
          message={error}
          actionLabel="Réessayer"
          onAction={() => {
            setError(null);
            if (trips)
              void trips
                .list()
                .then(setItems)
                .catch((cause: unknown) =>
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Erreur de chargement",
                  ),
                );
          }}
        />
      ) : null}
      {trips && !error && items.length === 0 ? (
        <EmptyState
          title="Aucun Voyage"
          message="Créez votre premier Voyage privé."
          actionLabel="Créer un Voyage"
          onAction={() => router.push("/(app)/trips/new")}
        />
      ) : null}
      <View style={{ gap: 12 }}>
        {items.map((trip) => (
          <Card
            key={trip.id}
            onPress={() => router.push(`/(app)/trips/${trip.id}`)}
          >
            <Text>{trip.name}</Text>
            <Text>{trip.referenceCurrency}</Text>
          </Card>
        ))}
      </View>
    </ShellFrame>
  );
}

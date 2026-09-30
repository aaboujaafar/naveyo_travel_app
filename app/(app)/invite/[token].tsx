import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import {
  Badge,
  Button,
  Card,
  ShellFrame,
  StatusPanel,
} from "../../../src/ui";
import { colors } from "../../../src/theme/colors";
import { spacing } from "../../../src/theme/spacing";
import { typography } from "../../../src/theme/typography";
import { useTripsModule } from "../../../src/modules/trips";
import type { UUID } from "../../../src/modules/_shared/model";

export default function AcceptInvitationScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const trips = useTripsModule();
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const accept = async () => {
    if (!trips || !token) return;
    setAccepting(true);
    setError(null);
    try {
      const invitation = await trips.acceptInvitation(token as UUID);
      router.replace(`/trips/${invitation.tripId}`);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d’accepter l’invitation",
      );
    } finally {
      setAccepting(false);
    }
  };

  return (
    <ShellFrame
      title="Invitation"
      subtitle="Rejoins un Voyage privé dans Naveyo."
    >
      <Card style={styles.card}>
        <Badge label="ACCÈS PRIVÉ" variant="teal" />
        <Text style={styles.title}>Vous êtes invité(e)</Text>
        <Text style={styles.message}>
          Votre compte sera ajouté comme éditeur. Vous pourrez consulter et gérer
          les informations partagées du Voyage.
        </Text>
      </Card>
      {error ? (
        <StatusPanel kind="error" title="Invitation refusée" message={error} />
      ) : null}
      <Button fullWidth loading={accepting} disabled={!trips || !token} onPress={() => void accept()}>
        Accepter l’invitation
      </Button>
      <Button fullWidth variant="secondary" onPress={() => router.back()}>
        Plus tard
      </Button>
    </ShellFrame>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
  },
  title: {
    ...typography.h2,
    color: colors.fg,
  },
  message: {
    ...typography.bodySmall,
    color: colors.muted,
  },
});

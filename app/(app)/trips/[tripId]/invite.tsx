import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  Input,
  ScreenNote,
  ShellFrame,
  StatusPanel,
} from "../../../../src/ui";
import { colors } from "../../../../src/theme/colors";
import { spacing } from "../../../../src/theme/spacing";
import { typography } from "../../../../src/theme/typography";
import { useTripsModule } from "../../../../src/modules/trips";
import type { Trip, TripInvitation } from "../../../../src/modules/_shared/model";

export default function TripInviteScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const trips = useTripsModule();
  const [email, setEmail] = useState("");
  const [invitation, setInvitation] = useState<TripInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const createInvitation = async () => {
    if (!trips || !tripId) return;
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
    <ShellFrame
      title="Inviter un membre"
      subtitle="Partage l’accès privé au Voyage avec le second Compte."
    >
      <Card style={styles.heroCard}>
        <Badge label="COLLABORATION PRIVÉE" variant="teal" />
        <Text style={styles.heroTitle}>Un Voyage à deux</Text>
        <Text style={styles.heroMessage}>
          L’invitation donne le rôle éditeur. Le membre pourra consulter et
          gérer les informations du Voyage après acceptation.
        </Text>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adresse e-mail du membre</Text>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="partenaire@exemple.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {error ? (
          <StatusPanel kind="error" title="Invitation impossible" message={error} />
        ) : null}
        <Button
          fullWidth
          loading={creating}
          disabled={!email.trim() || !trips}
          onPress={() => void createInvitation()}
        >
          Créer l’invitation
        </Button>
      </View>

      {invitation ? (
        <Card style={styles.successCard}>
          <Badge label="INVITATION PRÊTE" variant="success" />
          <Text style={styles.successTitle}>Code à transmettre</Text>
          <Text style={styles.successMessage}>
            Transmets ce code au membre. Il devra se connecter avec l’adresse
            e-mail invitée avant de l’accepter.
          </Text>
          <Text selectable style={styles.token} accessibilityLabel="Code d’invitation">
            {invitation.token}
          </Text>
        </Card>
      ) : null}

      <ScreenNote>
        Les invitations expirent après 7 jours et ne donnent jamais accès à un
        autre Voyage.
      </ScreenNote>

      <Button fullWidth variant="secondary" onPress={() => router.back()}>
        Retour au Voyage
      </Button>
    </ShellFrame>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.fg,
  },
  heroMessage: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.fg,
  },
  successCard: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderColor: colors.success,
  },
  successTitle: {
    ...typography.h3,
    color: colors.fg,
  },
  successMessage: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  token: {
    ...typography.h3,
    color: colors.accent,
    letterSpacing: 1.5,
    marginTop: spacing.sm,
  },
});

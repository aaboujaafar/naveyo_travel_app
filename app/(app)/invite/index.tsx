import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button, Card, Input, ShellFrame } from "../../../src/ui";
import { colors } from "../../../src/theme/colors";
import { spacing } from "../../../src/theme/spacing";
import { typography } from "../../../src/theme/typography";

export default function InvitationCodeScreen() {
  const router = useRouter();
  const [token, setToken] = useState("");

  return (
    <ShellFrame
      title="Rejoindre un Voyage"
      subtitle="Saisis le code reçu par l’autre membre."
    >
      <Card style={styles.card}>
        <Text style={styles.title}>Une invitation t’attend</Text>
        <Text style={styles.message}>
          Utilise le code exact reçu et connecte-toi avec l’adresse e-mail qui
          a été invitée.
        </Text>
      </Card>
      <Input
        label="Code d’invitation"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
      />
      <Button
        fullWidth
        disabled={token.trim().length < 36}
        onPress={() => router.push(`/(app)/invite/${token.trim()}`)}
      >
        Vérifier l’invitation
      </Button>
      <Button fullWidth variant="secondary" onPress={() => router.back()}>
        Retour
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

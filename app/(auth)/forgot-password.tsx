import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button, Input, ShellFrame, StatusPanel } from "../../src/ui";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <ShellFrame
      title="Réinitialisation"
      subtitle="Préparez le flux de récupération du shell."
    >
      <View style={styles.intro}>
        <Text style={styles.title}>Mot de passe oublié ?</Text>
        <Text style={styles.message}>
          Le formulaire ci-dessous vérifie la navigation et les états de
          formulaire sans appeler Supabase.
        </Text>
      </View>

      <StatusPanel
        kind="info"
        title="Connexion absente"
        message="Aucune session n’est chargée tant que le shell n’est pas branché à l’identité."
      />

      <View style={styles.form}>
        <Input
          label="Adresse e-mail"
          placeholder="vous@exemple.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <Button onPress={() => router.back()} fullWidth>
        Envoyer le lien
      </Button>
      <Button
        variant="secondary"
        onPress={() => router.replace("/(auth)/sign-in")}
        fullWidth
      >
        Retour à la connexion
      </Button>
    </ShellFrame>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.fg,
  },
  message: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  form: {
    gap: spacing.md,
  },
});

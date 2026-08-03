import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Input, ShellFrame, ScreenNote, useShellSession } from '../../src/ui';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function SignUpScreen() {
  const router = useRouter();
  const { signInForShell } = useShellSession();

  return (
    <ShellFrame
      title="Créer un compte"
      subtitle="Préparez le second compte membre du voyage dans le shell."
    >
      <View style={styles.branding}>
        <Text style={styles.brand}>Accès privé</Text>
        <Text style={styles.tagline}>Le vrai branchement d’authentification viendra après ce shell local.</Text>
      </View>

      <View style={styles.form}>
        <Input label="Nom complet" placeholder="Prénom Nom" autoCapitalize="words" />
        <Input label="Adresse e-mail" placeholder="vous@exemple.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Mot de passe" placeholder="••••••••" secureTextEntry />
      </View>

      <Button onPress={signInForShell} fullWidth>
        Créer le compte
      </Button>
      <Button variant="secondary" onPress={() => router.back()} fullWidth>
        Retour à la connexion
      </Button>

      <ScreenNote>
        Ce parcours existe pour valider la navigation protégée, pas pour créer un compte réel.
      </ScreenNote>
    </ShellFrame>
  );
}

const styles = StyleSheet.create({
  branding: {
    gap: spacing.xs,
  },
  brand: {
    ...typography.h1,
    color: colors.fg,
  },
  tagline: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  form: {
    gap: spacing.md,
  },
});

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Input, ShellFrame, ScreenNote, StatusPanel, useShellSession } from '../../src/ui';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function SignInScreen() {
  const router = useRouter();
  const { signInForShell } = useShellSession();

  return (
    <ShellFrame
      title="Connexion"
      subtitle="Accédez à votre voyage privé ou passez au shell authentifié."
    >
      <View style={styles.branding}>
        <Text style={styles.brand}>Naveyo</Text>
        <Text style={styles.tagline}>Préparation et consultation de voyage pour deux adultes.</Text>
      </View>

      <StatusPanel
        kind="empty"
        title="Aucun compte connecté"
        message="Ce shell prépare les routes protégées sans parler encore à Supabase."
      />

      <View style={styles.form}>
        <Input label="Adresse e-mail" placeholder="vous@exemple.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Mot de passe" placeholder="••••••••" secureTextEntry />
      </View>

      <Button onPress={signInForShell} fullWidth>
        Se connecter
      </Button>

      <View style={styles.secondaryActions}>
        <Button variant="secondary" onPress={() => router.push('/(auth)/sign-up')} fullWidth>
          Créer un compte
        </Button>
        <Pressable
          onPress={() => router.push('/(auth)/forgot-password')}
          accessibilityRole="link"
          accessibilityLabel="Mot de passe oublié"
          hitSlop={8}
        >
          <Text style={styles.link}>Mot de passe oublié ?</Text>
        </Pressable>
      </View>

      <ScreenNote>
        Ce bouton ouvre uniquement le shell authentifié local ; aucun compte réel n’est créé avant le branchement de l’identité.
      </ScreenNote>
    </ShellFrame>
  );
}

const styles = StyleSheet.create({
  branding: {
    gap: spacing.xs,
  },
  brand: {
    ...typography.displayHero,
    color: colors.fg,
  },
  tagline: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  form: {
    gap: spacing.md,
  },
  secondaryActions: {
    gap: spacing.sm,
  },
  link: {
    ...typography.label,
    color: colors.accent,
    textAlign: 'center',
  },
});

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthFrame, Button, Input, ScreenNote, StatusPanel, useShellSession } from '../../src/ui';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useShellSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await signIn({ email: email.trim(), password });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Connexion"
      subtitle="Accédez à votre voyage privé ou passez au shell authentifié."
    >
      <View style={styles.branding}>
        <Text style={styles.brand}>Naveyo</Text>
        <Text style={styles.tagline}>Préparation et consultation de voyage pour deux adultes.</Text>
      </View>

      {error ? <StatusPanel kind="error" title="Connexion impossible" message={error} /> : null}

      <View style={styles.form}>
        <Input label="Adresse e-mail" value={email} onChangeText={setEmail} placeholder="vous@exemple.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Mot de passe" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
      </View>

      <Button onPress={() => void submit()} loading={loading} disabled={!email.trim() || password.length < 6} fullWidth>
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

      <ScreenNote>La connexion utilise Supabase Auth et conserve la session dans le stockage sécurisé de l’iPhone.</ScreenNote>
    </AuthFrame>
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

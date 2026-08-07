import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthFrame, Button, Input, ScreenNote, StatusPanel, useShellSession } from '../../src/ui';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useShellSession();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await signUp({ displayName: displayName.trim(), email: email.trim(), password });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Création impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Créer un compte"
      subtitle="Préparez le second compte membre du voyage dans le shell."
    >
      <View style={styles.branding}>
        <Text style={styles.brand}>Accès privé</Text>
        <Text style={styles.tagline}>Créez le premier Compte du Voyage dans Supabase.</Text>
      </View>

      <View style={styles.form}>
        <Input label="Nom complet" value={displayName} onChangeText={setDisplayName} placeholder="Prénom Nom" autoCapitalize="words" />
        <Input label="Adresse e-mail" value={email} onChangeText={setEmail} placeholder="vous@exemple.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Mot de passe" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
      </View>

      {error ? <StatusPanel kind="error" title="Création impossible" message={error} /> : null}
      <Button onPress={() => void submit()} loading={loading} disabled={!displayName.trim() || !email.trim() || password.length < 6} fullWidth>
        Créer le compte
      </Button>
      <Button variant="secondary" onPress={() => router.back()} fullWidth>
        Retour à la connexion
      </Button>

      <ScreenNote>Le Compte est créé dans Supabase et la session est conservée dans le stockage sécurisé de l’iPhone.</ScreenNote>
    </AuthFrame>
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

import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  AuthFrame,
  Button,
  Input,
  ScreenNote,
  StatusPanel,
  useShellSession,
} from "../../src/ui";
import { spacing } from "../../src/theme/spacing";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useShellSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await signIn({ email: email.trim(), password });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Bon retour"
      subtitle="Connectez-vous pour retrouver vos Voyages."
    >
      {error ? (
        <StatusPanel
          kind="error"
          title="Connexion impossible"
          message={error}
        />
      ) : null}

      <View style={styles.form}>
        <Input
          label="Adresse e-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="vous@exemple.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          autoComplete="email"
        />
        <Input
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
        />
      </View>

      <Button
        onPress={() => void submit()}
        loading={loading}
        disabled={!email.trim() || password.length < 6}
        fullWidth
      >
        Se connecter
      </Button>

      <View style={styles.secondaryActions}>
        <Button
          variant="secondary"
          onPress={() => router.push("/(auth)/sign-up")}
          fullWidth
        >
          Créer un compte
        </Button>
      </View>

      <ScreenNote>
        Votre session reste privée et protégée sur cet appareil.
      </ScreenNote>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  secondaryActions: {
    gap: spacing.sm,
  },
});

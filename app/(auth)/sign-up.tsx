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

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useShellSession();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await signUp({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Création impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Créer votre compte"
      subtitle="Préparez un Voyage ou rejoignez celui d’un proche."
    >
      <View style={styles.form}>
        <Input
          label="Nom complet"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Prénom Nom"
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
        />
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
          textContentType="newPassword"
          autoComplete="new-password"
          hint="6 caractères minimum"
        />
      </View>

      {error ? (
        <StatusPanel kind="error" title="Création impossible" message={error} />
      ) : null}
      <Button
        onPress={() => void submit()}
        loading={loading}
        disabled={!displayName.trim() || !email.trim() || password.length < 6}
        fullWidth
      >
        Créer le compte
      </Button>
      <Button variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(auth)/sign-in"))} fullWidth>
        Retour à la connexion
      </Button>

      <ScreenNote>
        Votre compte et vos Voyages restent accessibles uniquement aux
        personnes invitées.
      </ScreenNote>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
});

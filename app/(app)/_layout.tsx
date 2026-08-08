import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";
import { Button, ConnectivityBanner, useShellSession } from "../../src/ui";
import { createAppleShareInbox } from "../../src/adapters/apple-document-analysis";

export default function AppLayout() {
  const router = useRouter();
  const { signOut } = useShellSession();
  const lastSyncedAt = "2026-07-29T08:30:00.000Z";

  useEffect(() => {
    void createAppleShareInbox()
      .list()
      .then((pending) => {
        if (pending.length > 0) router.replace("/(app)/imports");
      })
      .catch(() => {
        // The native inbox is unavailable outside an iOS development build.
      });
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.bannerWrap}>
        <ConnectivityBanner isOffline={false} lastSyncedAt={lastSyncedAt} />
        <View style={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => router.push("/(app)/account")}
          >
            Compte
          </Button>
          <Button variant="ghost" size="sm" onPress={() => void signOut()}>
            Se déconnecter
          </Button>
        </View>
      </View>
      <View style={styles.stack}>
        <Stack
          initialRouteName="index"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bannerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  stack: {
    flex: 1,
  },
});

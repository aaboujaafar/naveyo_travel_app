import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";
import { Button, ConnectivityBanner, useShellSession } from "../../src/ui";
import { createAppleShareInbox } from "../../src/adapters/apple-document-analysis";

export default function AppLayout() {
  const router = useRouter();
  const { signOut } = useShellSession();
  const lastSyncedAt = "2026-07-29T08:30:00.000Z";
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkConnectivity = async () => {
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!url) return;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(`${url}/auth/v1/health`, {
          method: "GET",
          signal: controller.signal,
        });
        if (mounted) setIsOffline(!response.ok);
      } catch {
        if (mounted) setIsOffline(true);
      } finally {
        clearTimeout(timeout);
      }
    };
    void checkConnectivity();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkConnectivity();
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    void createAppleShareInbox()
      .list()
      .then(async (pending) => {
        const fresh = pending.filter((item) => item.status === "new");
        await Promise.all(fresh.map((item) => createAppleShareInbox().updateStatus(item.id, "seen")));
        if (fresh.length > 0) router.replace("/(app)/imports");
      })
      .catch(() => {
        // The native inbox is unavailable outside an iOS development build.
      });
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.bannerWrap}>
        <ConnectivityBanner isOffline={isOffline} lastSyncedAt={lastSyncedAt} />
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

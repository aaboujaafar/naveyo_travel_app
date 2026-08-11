import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../../src/theme/colors";
import { createAppleShareInbox } from "../../src/adapters/apple-document-analysis";

export default function AppLayout() {
  const router = useRouter();

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
  stack: {
    flex: 1,
  },
});

import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../../src/theme/colors";
import { useNaveyoBootstrap } from "../../src/bootstrap";

export default function AppLayout() {
  const router = useRouter();
  const bootstrap = useNaveyoBootstrap();

  useEffect(() => {
    const inbox = bootstrap?.modules.reservationImportInbox;
    if (!inbox) return;
    void inbox
      .list()
      .then(async (pending) => {
        const fresh = pending.filter((item) => item.status === "new");
        await Promise.all(fresh.map((item) => inbox.updateStatus(item.id, "seen")));
        if (fresh.length > 0) router.replace("/(app)/imports");
      })
      .catch(() => {
        // The native inbox is unavailable outside an iOS development build.
      });
  }, [bootstrap, router]);

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

import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { Button, ConnectivityBanner } from '../../src/ui';

export default function AppLayout() {
  const router = useRouter();
  const lastSyncedAt = '2026-07-29T08:30:00.000Z';

  return (
    <View style={styles.container}>
      <View style={styles.bannerWrap}>
        <ConnectivityBanner isOffline={false} lastSyncedAt={lastSyncedAt} />
        <Button variant="ghost" size="sm" onPress={() => router.replace('/(auth)/sign-in')}>
          Se déconnecter
        </Button>
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
  stack: {
    flex: 1,
  },
});

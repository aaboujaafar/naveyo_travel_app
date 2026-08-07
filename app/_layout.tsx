import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme/colors';
import { ShellNavigationGate, ShellSessionProvider } from '../src/ui';
import { TripsModuleProvider } from '../src/modules/trips';
import { createAppModules } from '../src/bootstrap/app-modules';
import { useMemo } from 'react';

export default function RootLayout() {
  const modules = useMemo(() => createAppModules(), []);

  return (
    <SafeAreaProvider>
      <ShellSessionProvider identity={modules.identity}>
        <TripsModuleProvider module={modules.trips}>
          <ShellNavigationGate>
            <StatusBar style="dark" />
            <View style={styles.container}>
              <Stack
                initialRouteName="(auth)"
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                }}
              />
            </View>
          </ShellNavigationGate>
        </TripsModuleProvider>
      </ShellSessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});

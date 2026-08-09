<<<<<<< HEAD
import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors } from "../src/theme/colors";
import { ShellNavigationGate, ShellSessionProvider } from "../src/ui";
import { TripsModuleProvider } from "../src/modules/trips";
import { TripAssistantProvider } from "../src/modules/trip-assistant";
import { DocumentsProvider } from "../src/modules/documents";
import { NaveyoBootstrapProvider } from "../src/bootstrap";
import { createAppModules } from "../src/bootstrap/app-modules";
import { useMemo } from "react";
=======
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme/colors';
import { ShellNavigationGate, ShellSessionProvider } from '../src/ui';
import { NaveyoBootstrapProvider } from '../src/bootstrap';
>>>>>>> b2f5e19 (feat(int-101): compose integrated trip journey)

export default function RootLayout() {
  const modules = useMemo(() => createAppModules(), []);

  return (
    <SafeAreaProvider>
<<<<<<< HEAD
      <ShellSessionProvider identity={modules.identity}>
        <NaveyoBootstrapProvider bootstrap={null}>
          <TripsModuleProvider module={modules.trips}>
            <TripAssistantProvider module={modules.tripAssistant}>
              <DocumentsProvider module={modules.documents}>
                <ShellNavigationGate>
=======
      <ShellSessionProvider>
        <NaveyoBootstrapProvider bootstrap={null}>
          <ShellNavigationGate>
>>>>>>> b2f5e19 (feat(int-101): compose integrated trip journey)
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
<<<<<<< HEAD
                </ShellNavigationGate>
              </DocumentsProvider>
            </TripAssistantProvider>
          </TripsModuleProvider>
        </NaveyoBootstrapProvider>
=======
          </ShellNavigationGate>
        </NaveyoBootstrapProvider>
>>>>>>> b2f5e19 (feat(int-101): compose integrated trip journey)
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

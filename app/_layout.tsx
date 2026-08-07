import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors } from "../src/theme/colors";
import { ShellNavigationGate, ShellSessionProvider } from "../src/ui";
import { TripsModuleProvider } from "../src/modules/trips";
import { TripAssistantProvider } from "../src/modules/trip-assistant";
import { DocumentsProvider } from "../src/modules/documents";
import { createAppModules } from "../src/bootstrap/app-modules";
import { useMemo } from "react";

export default function RootLayout() {
  const modules = useMemo(() => createAppModules(), []);

  return (
    <SafeAreaProvider>
      <ShellSessionProvider identity={modules.identity}>
        <TripsModuleProvider module={modules.trips}>
          <TripAssistantProvider module={modules.tripAssistant}>
            <DocumentsProvider module={modules.documents}>
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
            </DocumentsProvider>
          </TripAssistantProvider>
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

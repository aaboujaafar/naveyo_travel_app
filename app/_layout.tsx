import { Stack } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NaveyoBootstrapProvider } from "../src/bootstrap";
import { createAppModules } from "../src/bootstrap/app-modules";
import { DocumentsProvider } from "../src/modules/documents";
import { TripAssistantProvider } from "../src/modules/trip-assistant";
import { TripsModuleProvider } from "../src/modules/trips";
import { ShellNavigationGate, ShellSessionProvider } from "../src/ui";
import { colors } from "../src/theme/colors";

export default function RootLayout() {
  const modules = useMemo(() => createAppModules(), []);

  return (
    <SafeAreaProvider>
      <ShellSessionProvider identity={modules.identity}>
        <NaveyoBootstrapProvider bootstrap={null}>
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
        </NaveyoBootstrapProvider>
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

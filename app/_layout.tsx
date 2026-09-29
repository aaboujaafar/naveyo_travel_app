import { Stack } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  createNaveyoBootstrap,
  NaveyoBootstrapProvider,
} from "../src/bootstrap";
import { createAppModules } from "../src/bootstrap/app-modules";
import { DocumentsProvider } from "../src/modules/documents";
import { PackingListProvider } from "../src/modules/packing-list/context";
import { TripAssistantProvider } from "../src/modules/trip-assistant";
import { TripsModuleProvider } from "../src/modules/trips";
import { ShellNavigationGate, ShellSessionProvider } from "../src/ui";
import { colors } from "../src/theme/colors";

export default function RootLayout() {
  const modules = useMemo(() => createAppModules(), []);
  const bootstrap = useMemo(() => createNaveyoBootstrap(modules), [modules]);

  return (
    <SafeAreaProvider>
      <ShellSessionProvider identity={modules.identity}>
        <NaveyoBootstrapProvider bootstrap={bootstrap}>
          <TripsModuleProvider module={modules.trips}>
            <TripAssistantProvider module={modules.tripAssistant}>
              <DocumentsProvider module={modules.documents}>
                <PackingListProvider module={modules.packingList}>
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
                </PackingListProvider>
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

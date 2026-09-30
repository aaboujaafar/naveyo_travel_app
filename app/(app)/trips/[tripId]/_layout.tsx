import { Stack } from "expo-router";
import { colors } from "../../../../src/theme/colors";

/**
 * The Voyage tabs sit at the bottom of this stack; detail screens (Étape, budget,
 * bagages…) are pushed above them and hide the tab bar, as in native iOS apps.
 */
export default function TripLayout() {
  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}

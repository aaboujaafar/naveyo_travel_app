import { useLocalSearchParams } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { colors } from "../../../../../src/theme/colors";
import { TripRouteProvider } from "../../../../../src/ui/TripRouteContext";

/**
 * System tab bar (UITabBar): Liquid Glass on iOS 26 and later, the classic
 * translucent bar on earlier versions. Leave its background unset so the glass
 * material shows through. Our screens scroll inside nested views, so UIKit never
 * detects the scroll edge: the bar keeps its material instead of turning fully
 * transparent before iOS 26.
 */
export default function TripTabsLayout() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return (
    <TripRouteProvider tripId={typeof tripId === "string" ? tripId : undefined}>
      <NativeTabs tintColor={colors.accentStrong} minimizeBehavior="onScrollDown" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
          <NativeTabs.Trigger.Label>Aperçu</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="itinerary/index">
          <NativeTabs.Trigger.Icon sf={{ default: "map", selected: "map.fill" }} />
          <NativeTabs.Trigger.Label>Carte</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="assistant/index">
          <NativeTabs.Trigger.Icon sf="sparkles" />
          <NativeTabs.Trigger.Label>Explorer</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="documents/index">
          <NativeTabs.Trigger.Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
          <NativeTabs.Trigger.Label>Documents</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </TripRouteProvider>
  );
}

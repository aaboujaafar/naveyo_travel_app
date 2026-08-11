import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme";

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View accessibilityElementsHidden style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  divider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});

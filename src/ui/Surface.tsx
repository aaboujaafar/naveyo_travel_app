import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, shadows } from "../theme";

export type SurfaceVariant = "default" | "flat" | "elevated";

export interface SurfaceProps {
  variant?: SurfaceVariant;
  style?: StyleProp<ViewStyle>;
}

export function Surface({
  variant = "default",
  style,
  children,
}: PropsWithChildren<SurfaceProps>) {
  return <View style={[styles.base, styles[variant], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  default: {
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  flat: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    ...shadows.md,
  },
});

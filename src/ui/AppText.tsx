import type { PropsWithChildren } from "react";
import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from "react-native";
import { colors, typography, type TypographyToken } from "../theme";

export type AppTextColor =
  | "fg"
  | "muted"
  | "accent"
  | "teal"
  | "gold"
  | "success"
  | "danger"
  | "onAccent";

export type AppTextAlign = "left" | "center" | "right";

export interface AppTextProps extends Omit<TextProps, "style"> {
  variant?: TypographyToken;
  color?: AppTextColor;
  align?: AppTextAlign;
  style?: StyleProp<TextStyle>;
}

const colorStyles = StyleSheet.create({
  fg: { color: colors.fg },
  muted: { color: colors.muted },
  accent: { color: colors.accentStrong },
  teal: { color: colors.tealStrong },
  gold: { color: colors.goldStrong },
  success: { color: colors.success },
  danger: { color: colors.danger },
  onAccent: { color: colors.white },
});

const alignStyles = StyleSheet.create({
  left: { textAlign: "left" },
  center: { textAlign: "center" },
  right: { textAlign: "right" },
});

export function AppText({
  variant = "body",
  color = "fg",
  align = "left",
  style,
  children,
  ...textProps
}: PropsWithChildren<AppTextProps>) {
  return (
    <Text
      allowFontScaling
      {...textProps}
      style={[typography[variant], colorStyles[color], alignStyles[align], style]}
    >
      {children}
    </Text>
  );
}

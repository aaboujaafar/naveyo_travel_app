import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, spacing } from "../theme";
import { AppText } from "./AppText";
import { Icon } from "./Icon";

export type InlineMessageVariant = "info" | "success" | "error";

export interface InlineMessageProps {
  title: string;
  message?: string;
  variant?: InlineMessageVariant;
  style?: StyleProp<ViewStyle>;
}

export function InlineMessage({
  title,
  message,
  variant = "info",
  style,
}: InlineMessageProps) {
  const foreground =
    variant === "error"
      ? colors.danger
      : variant === "success"
        ? colors.success
        : colors.teal;

  return (
    <View
      accessibilityRole={variant === "error" ? "alert" : "summary"}
      style={[styles.base, styles[variant], style]}
    >
      <Icon name={variant === "success" ? "check" : "info"} size={20} color={foreground} />
      <View style={styles.content}>
        <AppText variant="label" color={variant === "error" ? "danger" : variant === "success" ? "success" : "teal"}>
          {title}
        </AppText>
        {message ? (
          <AppText variant="caption" color="muted">
            {message}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  info: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
  },
  success: {
    backgroundColor: colors.surface,
    borderColor: colors.success,
  },
  error: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
});

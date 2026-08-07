import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]} accessibilityRole="summary">
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <Button
          variant="secondary"
          size="sm"
          onPress={onAction}
          style={styles.action}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["2xl"],
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  icon: {
    marginBottom: spacing.sm,
    opacity: 0.6,
  },
  title: {
    ...typography.h3,
    color: colors.fg,
    textAlign: "center",
  },
  message: {
    ...typography.bodySmall,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 260,
  },
  action: {
    marginTop: spacing.md,
  },
});

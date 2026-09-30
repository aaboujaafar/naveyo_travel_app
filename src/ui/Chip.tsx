import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";
import { radius } from "../theme/radius";

export interface ChipProps {
  label: string;
  active?: boolean;
  variant?: "default" | "teal" | "gold";
  icon?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({
  label,
  active = false,
  variant = "default",
  icon,
  onPress,
  style,
}: ChipProps) {
  const variantStyle = active
    ? styles.active
    : variant === "teal"
      ? styles.teal
      : variant === "gold"
        ? styles.gold
        : null;

  const textStyle = active
    ? styles.textActive
    : variant === "teal"
      ? styles.textTeal
      : variant === "gold"
        ? styles.textGold
        : styles.textDefault;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        hitSlop={6}
        style={({ pressed }) => [
          styles.chip,
          variantStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {icon && icon}
        <Text style={[styles.text, textStyle]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled
      accessibilityRole="text"
      accessibilityState={{ selected: active }}
      style={[styles.chip, variantStyle, style]}
    >
      {icon && icon}
      <Text style={[styles.text, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignSelf: "flex-start",
  },
  active: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  teal: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
  },
  gold: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
  text: {
    ...typography.bodySmall,
    fontWeight: "500",
    letterSpacing: 0.28,
  },
  textDefault: {
    color: colors.fg,
  },
  textActive: {
    color: colors.accentStrong,
  },
  textTeal: {
    color: colors.tealStrong,
  },
  textGold: {
    color: colors.goldStrong,
  },
});

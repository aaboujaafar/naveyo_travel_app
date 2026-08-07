import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { radius } from "../theme/radius";

export interface BadgeProps {
  label: string;
  variant?: "accent" | "teal" | "gold" | "success" | "danger";
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Badge({ label, variant = "accent", icon, style }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant], style]}>
      {icon && icon}
      <Text style={[styles.text, styles[`text_${variant}`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  accent: {
    backgroundColor: colors.accentSoft,
  },
  teal: {
    backgroundColor: colors.tealSoft,
  },
  gold: {
    backgroundColor: colors.goldSoft,
  },
  success: {
    backgroundColor: "#e8f5ee",
  },
  danger: {
    backgroundColor: "#fdeaea",
  },
  text: {
    ...typography.badge,
    textTransform: "uppercase",
  },
  text_accent: {
    color: colors.accent,
  },
  text_teal: {
    color: colors.teal,
  },
  text_gold: {
    color: "#8a6b1e",
  },
  text_success: {
    color: colors.success,
  },
  text_danger: {
    color: colors.danger,
  },
});

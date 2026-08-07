import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";
import { IconButton } from "./Button";

export interface TopBarProps {
  title: string;
  onBack?: () => void;
  backIcon?: React.ReactNode;
  actions?: React.ReactNode;
  transparent?: boolean;
  style?: ViewStyle;
}

export function TopBar({
  title,
  onBack,
  backIcon,
  actions,
  transparent = false,
  style,
}: TopBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, spacing.md) },
        transparent && styles.transparent,
        style,
      ]}
    >
      {onBack ? (
        <IconButton
          icon={backIcon ?? <DefaultBackIcon />}
          onPress={onBack}
          accessibilityLabel={`Retour à ${title}`}
        />
      ) : (
        <View style={styles.spacer} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {actions ? (
        <View style={styles.actions}>{actions}</View>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

function DefaultBackIcon() {
  return (
    <View style={styles.backArrow}>
      <Text style={styles.backArrowText}>{"‹"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  transparent: {
    backgroundColor: "transparent",
  },
  title: {
    ...typography.h2,
    color: colors.fg,
    flex: 1,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  spacer: {
    width: 44,
  },
  backArrow: {
    alignItems: "center",
    justifyContent: "center",
  },
  backArrowText: {
    fontSize: 24,
    color: colors.fg,
    fontWeight: "300",
  },
});

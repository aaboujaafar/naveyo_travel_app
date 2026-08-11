import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { AppText } from "./AppText";
import { IconButton } from "./Button";
import { Icon } from "./Icon";

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
      <AppText variant="h2" align="center" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      {actions ? (
        <View style={styles.actions}>{actions}</View>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

function DefaultBackIcon() {
  return <Icon name="arrow-left" size={20} />;
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
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  spacer: {
    width: 44,
  },
});

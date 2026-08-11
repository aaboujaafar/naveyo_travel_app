import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, layout, radius } from "../theme";

export interface SwitchProps {
  value: boolean;
  label: string;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Switch({
  value,
  label,
  onChange,
  disabled = false,
  style,
}: SwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        styles.touchTarget,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.thumb, value && styles.thumbOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    minWidth: layout.minimumTouchTarget,
    minHeight: layout.minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    width: 44,
    height: 26,
    borderRadius: radius.full,
    padding: 3,
    backgroundColor: colors.border,
  },
  trackOn: {
    backgroundColor: colors.accent,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  thumbOn: {
    transform: [{ translateX: 18 }],
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.4,
  },
});

import { useEffect, useRef } from 'react';
import { View, Text, Animated, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';

export interface ToastData {
  id: string;
  title: string;
  message?: string;
  variant?: 'success' | 'teal' | 'danger';
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
  duration?: number;
}

export function Toast({ toast, onDismiss, duration = 3000 }: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onDismiss(toast.id));
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss, toast.id, translateY]);

  const borderColor =
    toast.variant === 'danger' ? colors.danger : toast.variant === 'teal' ? colors.teal : colors.success;

  return (
    <Animated.View
      style={[
        styles.toast,
        shadows.md,
        { top: insets.top + spacing.sm, borderLeftColor: borderColor, transform: [{ translateY }] },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.body}>
        <Text style={styles.title}>{toast.title}</Text>
        {toast.message && <Text style={styles.message}>{toast.message}</Text>}
      </View>
      {toast.actionLabel && toast.onAction && (
        <Pressable onPress={toast.onAction} hitSlop={8}>
          <Text style={styles.action}>{toast.actionLabel}</Text>
        </Pressable>
      )}
      <Pressable onPress={() => onDismiss(toast.id)} hitSlop={8} style={styles.close}>
        <Text style={styles.closeText}>{'✕'}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    padding: spacing.md,
    gap: spacing.sm,
    zIndex: 999,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.label,
    color: colors.fg,
  },
  message: {
    ...typography.caption,
    color: colors.muted,
  },
  action: {
    ...typography.label,
    color: colors.accent,
  },
  close: {
    padding: 4,
  },
  closeText: {
    fontSize: 14,
    color: colors.muted,
  },
});

import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

export interface SectionTitleProps {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function SectionTitle({ title, action, onAction, style }: SectionTitleProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {action && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.sectionTitle,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  action: {
    ...typography.label,
    color: colors.fg,
    textDecorationLine: 'underline',
  },
});

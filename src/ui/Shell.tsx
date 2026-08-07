import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { Skeleton } from './Skeleton';
import { describeConnectivity, type ShellConnectivityState } from './shell-helpers';

export interface ShellFrameProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
}

export function ShellFrame({ title, subtitle, children, headerAction, footer }: ShellFrameProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={styles.frame} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
      <ScrollView
        contentContainerStyle={[
          styles.frameContent,
          { paddingTop: Math.max(insets.top, spacing.md) + spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {headerAction ? <View style={styles.headerAction}>{headerAction}</View> : null}
      </View>

      <View style={styles.body}>{children}</View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthFrame({ title, subtitle, children, headerAction, footer }: ShellFrameProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.frame}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScrollView
        contentContainerStyle={[
          styles.frameContent,
          { paddingTop: Math.max(insets.top, spacing.md) + spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {headerAction ? <View style={styles.headerAction}>{headerAction}</View> : null}
        </View>

        <View style={styles.body}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export interface ConnectivityBannerProps extends ShellConnectivityState {
  style?: StyleProp<ViewStyle>;
}

export function ConnectivityBanner({ isOffline, lastSyncedAt, style }: ConnectivityBannerProps) {
  const { statusLabel, helperLabel, syncLabel } = describeConnectivity({ isOffline, lastSyncedAt });

  return (
    <View
      style={[styles.banner, style]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${statusLabel}. ${syncLabel}`}
    >
      <Badge label={statusLabel} variant={isOffline ? 'danger' : 'success'} />
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle}>{statusLabel}</Text>
        <Text style={styles.bannerMessage}>{helperLabel}</Text>
        <Text style={styles.bannerSync}>{syncLabel}</Text>
      </View>
    </View>
  );
}

export type StatusKind = 'loading' | 'error' | 'empty' | 'info';

export interface StatusPanelProps {
  kind?: StatusKind;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function StatusPanel({
  kind = 'info',
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: StatusPanelProps) {
  const isLoading = kind === 'loading';

  return (
    <Card style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <Badge
          label={
            kind === 'loading' ? 'Chargement' : kind === 'error' ? 'Erreur' : kind === 'empty' ? 'Vide' : 'Info'
          }
          variant={kind === 'error' ? 'danger' : kind === 'empty' ? 'gold' : kind === 'loading' ? 'teal' : 'accent'}
        />
        <Text style={styles.statusTitle}>{title}</Text>
        {message ? <Text style={styles.statusMessage}>{message}</Text> : null}
      </View>

      {isLoading ? (
        <View style={styles.skeletonStack} accessibilityLabel="Chargement en cours">
          <Skeleton height={16} />
          <Skeleton height={16} width="86%" />
          <Skeleton height={16} width="72%" />
        </View>
      ) : null}

      {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
        <View style={styles.statusActions}>
          {actionLabel && onAction ? (
            <Button fullWidth size="sm" onPress={onAction}>
              {actionLabel}
            </Button>
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <Button fullWidth size="sm" variant="secondary" onPress={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

export interface AuthChoiceProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export function AuthChoice({ onSignIn, onSignUp }: AuthChoiceProps) {
  return (
    <View style={styles.authChoices}>
      <Button fullWidth onPress={onSignIn}>
        Se connecter
      </Button>
      <Button fullWidth variant="secondary" onPress={onSignUp}>
        Créer un compte
      </Button>
    </View>
  );
}

export function ScreenNote({ children }: { children: React.ReactNode }) {
  return <Text style={styles.note}>{children}</Text>;
}

export function ShellListPlaceholder() {
  return (
    <View style={styles.placeholderList}>
      <Skeleton height={18} width="54%" />
      <Skeleton height={18} width="82%" />
      <Skeleton height={18} width="66%" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  frameContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  headerAction: {
    alignSelf: 'flex-start',
  },
  title: {
    ...typography.h1,
    color: colors.fg,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  body: {
    gap: spacing.lg,
  },
  footer: {
    paddingTop: spacing.xl,
  },
  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    ...typography.label,
    color: colors.fg,
  },
  bannerMessage: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  bannerSync: {
    ...typography.caption,
    color: colors.muted,
  },
  statusCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  statusHeader: {
    gap: spacing.sm,
  },
  statusTitle: {
    ...typography.h3,
    color: colors.fg,
  },
  statusMessage: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  statusActions: {
    gap: spacing.sm,
  },
  skeletonStack: {
    gap: spacing.sm,
  },
  authChoices: {
    gap: spacing.sm,
  },
  note: {
    ...typography.caption,
    color: colors.muted,
  },
  placeholderList: {
    gap: spacing.sm,
  },
});

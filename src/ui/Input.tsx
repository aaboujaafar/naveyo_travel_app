import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";
import { radius } from "../theme/radius";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const accessibilityLabel = label ?? props.placeholder ?? "Champ de saisie";
  const handleFocus = useCallback(
    (event: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
      setFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );
  const handleBlur = useCallback(
    (event: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
      setFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        onTouchStart={() => inputRef.current?.focus()}
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error && styles.fieldError,
        ]}
      >
        {leftIcon && <View pointerEvents="none" style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          ref={inputRef}
          {...props}
          style={styles.input}
          placeholderTextColor={colors.muted}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={error ?? hint}
          importantForAccessibility="yes"
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {rightIcon && <View pointerEvents="none" style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export interface TextAreaProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function TextArea({
  label,
  error,
  containerStyle,
  ...props
}: TextAreaProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const accessibilityLabel = label ?? props.placeholder ?? "Zone de texte";

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        onTouchStart={() => inputRef.current?.focus()}
        style={[
          styles.textArea,
          focused && styles.fieldFocused,
          error && styles.fieldError,
        ]}
      >
        <TextInput
          ref={inputRef}
          {...props}
          style={styles.textAreaInput}
          placeholderTextColor={colors.muted}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={error}
          importantForAccessibility="yes"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    ...typography.label,
    color: colors.fg,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  fieldFocused: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.fg,
    paddingVertical: 12,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: 100,
  },
  textAreaInput: {
    ...typography.body,
    color: colors.fg,
    padding: 0,
    minHeight: 80,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  hint: {
    ...typography.caption,
    color: colors.muted,
  },
});

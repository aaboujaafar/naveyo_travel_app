import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type ImageSourcePropType,
} from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";
import { radius } from "../theme/radius";
import { shadows } from "../theme/shadows";

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, onPress, style }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [
          styles.card,
          shadows.sm,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, shadows.sm, style]}>{children}</View>;
}

export interface CardImageProps {
  source: ImageSourcePropType;
  imageHeight?: number;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function CardImage({
  source,
  imageHeight = 160,
  children,
  onPress,
  style,
}: CardImageProps) {
  return (
    <Card onPress={onPress} style={[styles.overflow, style]}>
      <Image
        source={source}
        style={[styles.image, { height: imageHeight }]}
        resizeMode="cover"
      />
      {children && <View style={styles.cardBody}>{children}</View>}
    </Card>
  );
}

export interface CardHorizontalProps {
  imageSource?: ImageSourcePropType;
  imageSize?: number;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function CardHorizontal({
  imageSource,
  imageSize = 56,
  title,
  subtitle,
  trailing,
  onPress,
  style,
}: CardHorizontalProps) {
  return (
    <Card onPress={onPress} style={[styles.horizontal, style]}>
      {imageSource && (
        <Image
          source={imageSource}
          style={[
            styles.horizontalImage,
            { width: imageSize, height: imageSize },
          ]}
        />
      )}
      <View style={styles.horizontalContent}>
        <Text style={styles.horizontalTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.horizontalSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing && <View style={styles.horizontalTrailing}>{trailing}</View>}
    </Card>
  );
}

export interface CardStatProps {
  value: string;
  label: string;
  style?: StyleProp<ViewStyle>;
}

export function CardStat({ value, label, style }: CardStatProps) {
  return (
    <View style={[styles.stat, style]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overflow: {
    overflow: "hidden",
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  cardBody: {
    padding: spacing.md,
  },
  image: {
    width: "100%",
  },
  horizontal: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  horizontalImage: {
    borderRadius: radius.sm,
  },
  horizontalContent: {
    flex: 1,
    gap: 2,
  },
  horizontalTitle: {
    ...typography.label,
    color: colors.fg,
  },
  horizontalSubtitle: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  horizontalTrailing: {
    marginLeft: spacing.sm,
  },
  stat: {
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    ...typography.h2,
    color: colors.fg,
  },
  statLabel: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
});

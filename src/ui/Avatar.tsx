import { View, Text, Image, StyleSheet, type StyleProp, type ViewStyle, type ImageSourcePropType } from 'react-native';
import { colors } from '../theme/colors';

export type AvatarSize = 28 | 36 | 44 | 56 | 80;

export interface AvatarProps {
  source?: ImageSourcePropType;
  name?: string;
  size?: AvatarSize;
  presence?: 'online' | 'offline';
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ source, name, size = 44, presence, style }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {source ? (
        <Image source={source} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
        </View>
      )}
      {presence && (
        <View
          style={[
            styles.presence,
            { backgroundColor: presence === 'online' ? colors.success : colors.border },
            presence === 'online' && styles.presenceOnline,
          ]}
        />
      )}
    </View>
  );
}

export interface AvatarStackProps {
  avatars: AvatarProps[];
  maxVisible?: number;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
}

export function AvatarStack({ avatars, maxVisible = 4, size = 36, style }: AvatarStackProps) {
  const visible = avatars.slice(0, maxVisible);
  const overflow = avatars.length - maxVisible;

  return (
    <View style={[styles.stack, style]}>
      {visible.map((avatar, i) => (
        <Avatar
          key={i}
          {...avatar}
          size={size}
          style={[styles.stackItem, i > 0 && { marginLeft: -size * 0.28 }]}
        />
      ))}
      {overflow > 0 && (
        <View
          style={[
            styles.overflow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -size * 0.28,
            },
          ]}
        >
          <Text style={[styles.overflowText, { fontSize: size * 0.3 }]}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.accent,
    fontWeight: '600',
  },
  presence: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  presenceOnline: {},
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackItem: {
    borderWidth: 2.5,
    borderColor: colors.surface,
    borderRadius: 999,
  },
  overflow: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
  overflowText: {
    color: colors.muted,
    fontWeight: '600',
  },
});

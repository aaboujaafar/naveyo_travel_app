import { Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';

export default function AuthLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}

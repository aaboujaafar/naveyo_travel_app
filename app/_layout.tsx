import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme/colors';
import { ShellNavigationGate, ShellSessionProvider } from '../src/ui';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ShellSessionProvider>
        <ShellNavigationGate>
          <StatusBar style="dark" />
          <View style={styles.container}>
            <Stack
              initialRouteName="(auth)"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            />
          </View>
        </ShellNavigationGate>
      </ShellSessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});

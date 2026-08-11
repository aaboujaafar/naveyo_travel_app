import type { PropsWithChildren } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, layout, spacing } from "../theme";

export interface ScreenProps
  extends Pick<ScrollViewProps, "keyboardShouldPersistTaps"> {
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Screen({
  scroll = false,
  contentStyle,
  keyboardShouldPersistTaps = "handled",
  testID,
  children,
}: PropsWithChildren<ScreenProps>) {
  const composedContentStyle = [styles.content, contentStyle];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]} testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={composedContentStyle}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={composedContentStyle}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    width: "100%",
    maxWidth: layout.maxMobileWidth,
    flexGrow: 1,
    alignSelf: "center",
    paddingHorizontal: layout.screenHorizontalPadding,
    paddingVertical: spacing.md,
  },
});

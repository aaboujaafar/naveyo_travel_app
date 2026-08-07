import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../theme/colors";

export interface ProgressBarProps {
  progress: number;
  color?: "accent" | "teal" | "gold" | "success";
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  color = "accent",
  height = 6,
  style,
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped * 100}%`,
            backgroundColor: colors[color],
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

export interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: "accent" | "teal" | "gold" | "success";
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function CircularProgress({
  progress,
  size = 64,
  strokeWidth = 6,
  color = "accent",
  children,
  style,
}: CircularProgressProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const radiusCircle = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusCircle;
  const offset = circumference * (1 - clamped);

  return (
    <View style={[styles.circular, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusCircle}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusCircle}
          stroke={colors[color]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children && <View style={styles.circularContent}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.border,
    overflow: "hidden",
    alignSelf: "stretch",
  },
  fill: {
    height: "100%",
  },
  circular: {
    alignItems: "center",
    justifyContent: "center",
  },
  circularContent: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});

type ExpoMapsModule = typeof import("expo-maps");

/**
 * Keep runtime module-shape detection independent from React Native rendering.
 * This also lets Node-based tests exercise Metro's module variants without
 * loading the native `react-native` entry point.
 */
export function isExpoMapsModule(value: unknown): value is ExpoMapsModule {
  if (value === null || typeof value !== "object") return false;

  const candidate = value as {
    AppleMaps?: { View?: unknown };
  };
  return candidate.AppleMaps?.View !== undefined;
}

import { createRunOncePlugin, withInfoPlist, type ConfigPlugin, type InfoPlist } from 'expo/config-plugins';

export const trackingPermissionPrompts = {
  whenInUse: 'Naveyo needs location access to validate continuous trip tracking on device.',
  always:
    'Naveyo needs background location access to keep recording a trip trace when the screen is locked.',
} as const;

export function mergeLocationBackgroundModes(value: unknown): string[] {
  const modes = Array.isArray(value)
    ? value.filter((mode): mode is string => typeof mode === 'string')
    : [];

  return Array.from(new Set([...modes, 'location']));
}

export function applyTrackingInfoPlistDefaults(infoPlist: InfoPlist): InfoPlist {
  return {
    ...infoPlist,
    NSLocationWhenInUseUsageDescription: trackingPermissionPrompts.whenInUse,
    NSLocationAlwaysAndWhenInUseUsageDescription: trackingPermissionPrompts.always,
    UIBackgroundModes: mergeLocationBackgroundModes(infoPlist.UIBackgroundModes)
  };
}

const withNaveyoTracking: ConfigPlugin = (config) =>
  withInfoPlist(config, (config) => {
    config.modResults = applyTrackingInfoPlistDefaults(config.modResults as InfoPlist);
    return config;
  });

export default createRunOncePlugin(withNaveyoTracking, 'with-naveyo-tracking', '0.1.0');

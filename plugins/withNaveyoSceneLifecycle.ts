import {
  createRunOncePlugin,
  withAppDelegate,
  withInfoPlist,
  type ConfigPlugin,
  type InfoPlist,
} from 'expo/config-plugins';

/**
 * Apps built with the iOS 27 SDK refuse to launch without the UIScene life cycle
 * ("UIScene life cycle is required for apps built with this SDK"). Expo ships
 * `ExpoAppSceneDelegate`, but the Expo 57 template still creates the window in the
 * app delegate, so prebuild output is patched here until the template catches up.
 */
export const expoSceneDelegateClassName = 'EXExpoAppSceneDelegate';

export function applySceneManifest(infoPlist: InfoPlist): InfoPlist {
  return {
    ...infoPlist,
    UIApplicationSceneManifest: {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: expoSceneDelegateClassName,
          },
        ],
      },
    },
  };
}

const windowStartup = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

/**
 * The scene delegate now creates the window and starts React Native, so the app
 * delegate only builds the factory and exposes it through `ExpoReactNativeFactoryProvider`.
 */
export function adoptSceneLifecycleInAppDelegate(contents: string): string {
  let result = contents;
  if (!result.includes('ExpoReactNativeFactoryProvider')) {
    result = result.replace(
      'class AppDelegate: ExpoAppDelegate {',
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    );
  }
  return result.replace(
    windowStartup,
    '\n    // ExpoAppSceneDelegate creates the window and starts React Native (UIScene life cycle).\n',
  );
}

const withNaveyoSceneLifecycle: ConfigPlugin = (config) => {
  config = withInfoPlist(config, (config) => {
    config.modResults = applySceneManifest(config.modResults as InfoPlist);
    return config;
  });
  return withAppDelegate(config, (config) => {
    if (config.modResults.language === 'swift') {
      config.modResults.contents = adoptSceneLifecycleInAppDelegate(config.modResults.contents);
    }
    return config;
  });
};

export default createRunOncePlugin(withNaveyoSceneLifecycle, 'with-naveyo-scene-lifecycle', '0.1.0');

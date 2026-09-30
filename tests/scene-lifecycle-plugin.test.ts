import { describe, expect, it } from "vitest";
import {
  adoptSceneLifecycleInAppDelegate,
  applySceneManifest,
  expoSceneDelegateClassName,
} from "../plugins/withNaveyoSceneLifecycle";

const templateAppDelegate = `@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}`;

describe("scene life cycle plugin", () => {
  it("declares Expo's scene delegate", () => {
    const manifest = applySceneManifest({ CFBundleName: "Naveyo" }).UIApplicationSceneManifest as {
      UISceneConfigurations: { UIWindowSceneSessionRoleApplication: { UISceneDelegateClassName: string }[] };
    };
    expect(manifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication[0]?.UISceneDelegateClassName).toBe(expoSceneDelegateClassName);
  });

  it("leaves window creation to the scene delegate", () => {
    const patched = adoptSceneLifecycleInAppDelegate(templateAppDelegate);
    expect(patched).toContain("class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {");
    expect(patched).not.toContain("UIWindow(frame:");
    expect(patched).not.toContain("startReactNative");
    expect(adoptSceneLifecycleInAppDelegate(patched)).toBe(patched);
  });
});

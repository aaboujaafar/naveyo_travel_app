import { createRunOncePlugin, withDangerousMod, withEntitlementsPlist, withXcodeProject, type ConfigPlugin } from 'expo/config-plugins'
import fs from 'node:fs'
import path from 'node:path'

export const naveyoDocumentsPluginName = 'with-naveyo-documents'
export const naveyoDocumentsPluginVersion = '0.2.0'

const shareTargetName = 'NaveyoShare'
const appGroup = 'group.com.naveyo.app'

const shareInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
  <key>CFBundleDisplayName</key><string>Naveyo</string>
  <key>CFBundleExecutable</key><string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key><string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleShortVersionString</key><string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key><string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key><string>com.apple.share-services</string>
    <key>NSExtensionPrincipalClass</key><string>$(PRODUCT_MODULE_NAME).NaveyoShareViewController</string>
    <key>NSExtensionAttributes</key>
    <dict>
      <key>NSExtensionActivationRule</key>
      <dict>
        <key>NSExtensionActivationSupportsAttachmentsWithMaxCount</key><integer>1</integer>
        <key>NSExtensionActivationSupportsImageWithMaxCount</key><integer>1</integer>
        <key>NSExtensionActivationSupportsText</key><true/>
        <key>NSExtensionActivationSupportsWebURLWithMaxCount</key><integer>1</integer>
        <key>NSExtensionActivationSupportsMovieWithMaxCount</key><integer>0</integer>
        <key>NSExtensionActivationSupportsPDFWithMaxCount</key><integer>1</integer>
      </dict>
    </dict>
  </dict>
</dict>
</plist>
`

const appGroupEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array><string>${appGroup}</string></array>
</dict>
</plist>
`

const withNaveyoDocuments: ConfigPlugin = (config) => {
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.security.application-groups'] = [appGroup]
    return config
  })

  config = withDangerousMod(config, ['ios', async (config) => {
    const sourceRoot = path.join(config.modRequest.projectRoot, 'modules/naveyo-documents/ios')
    const targetRoot = path.join(config.modRequest.platformProjectRoot, shareTargetName)
    fs.mkdirSync(targetRoot, { recursive: true })
    fs.copyFileSync(path.join(sourceRoot, 'NaveyoShareViewController.swift'), path.join(targetRoot, 'NaveyoShareViewController.swift'))
    fs.copyFileSync(path.join(sourceRoot, 'NaveyoShareStore.swift'), path.join(targetRoot, 'NaveyoShareStore.swift'))
    fs.writeFileSync(path.join(targetRoot, `${shareTargetName}-Info.plist`), shareInfoPlist)
    fs.writeFileSync(path.join(targetRoot, `${shareTargetName}.entitlements`), appGroupEntitlements)
    return config
  }])

  config = withXcodeProject(config, (config) => {
    const project = config.modResults
    const existingTargetUuid = project.findTargetKey(shareTargetName)
    const target = existingTargetUuid ? { uuid: existingTargetUuid } : project.addTarget(shareTargetName, 'app_extension', shareTargetName, `${config.ios?.bundleIdentifier ?? 'com.naveyo.app'}.share`)
    const targetUuid = target.uuid
    const sourcePath = `${shareTargetName}/NaveyoShareViewController.swift`
    const storePath = `${shareTargetName}/NaveyoShareStore.swift`
    if (!project.hasFile(sourcePath)) {
      const mainGroup = project.getFirstProject().firstProject.mainGroup
      project.addSourceFile(sourcePath, { target: targetUuid }, mainGroup)
    }
    if (!project.hasFile(storePath)) {
      const mainGroup = project.getFirstProject().firstProject.mainGroup
      project.addSourceFile(storePath, { target: targetUuid }, mainGroup)
    }
    const configurations = project.pbxXCBuildConfigurationSection()
    Object.values(configurations).forEach((entry: unknown) => {
      if (!entry || typeof entry !== 'object' || !('buildSettings' in entry)) return
      const settings = (entry as { buildSettings?: Record<string, unknown> }).buildSettings
      if (settings?.PRODUCT_BUNDLE_IDENTIFIER === `"${config.ios?.bundleIdentifier ?? 'com.naveyo.app'}.share"`) {
        settings.INFOPLIST_FILE = `"${shareTargetName}/${shareTargetName}-Info.plist"`
        settings.CODE_SIGN_ENTITLEMENTS = `"${shareTargetName}/${shareTargetName}.entitlements"`
        settings.SWIFT_VERSION = '5.0'
        settings.IPHONEOS_DEPLOYMENT_TARGET = '15.1'
      }
    })
    return config
  })

  return config
}

export default createRunOncePlugin(withNaveyoDocuments, naveyoDocumentsPluginName, naveyoDocumentsPluginVersion)

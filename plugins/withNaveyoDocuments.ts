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
  <key>CFBundleName</key><string>NaveyoShare</string>
  <key>CFBundlePackageType</key><string>XPC!</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSRequiresIPhoneOS</key><true/>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key><string>com.apple.share-services</string>
    <key>NSExtensionPrincipalClass</key><string>$(PRODUCT_MODULE_NAME).NaveyoShareViewController</string>
    <key>NSExtensionAttributes</key>
    <dict>
        <key>NSExtensionActivationRule</key>
      <dict>
        <key>NSExtensionActivationSupportsAttachmentsWithMaxCount</key><integer>1</integer>
        <key>NSExtensionActivationSupportsFileWithMaxCount</key><integer>1</integer>
        <key>NSExtensionActivationSupportsImageWithMaxCount</key><integer>1</integer>
        <key>NSExtensionActivationSupportsText</key><true/>
        <key>NSExtensionActivationSupportsWebURLWithMaxCount</key><integer>1</integer>
        <key>NSExtensionActivationSupportsMovieWithMaxCount</key><integer>0</integer>
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
    const shareNativeTarget = project.pbxNativeTargetSection()[targetUuid] as { buildPhases?: { comment?: string; value?: string }[] }
    const objects = (project as unknown as { hash: { project: { objects: Record<string, Record<string, unknown>> } } }).hash.project.objects
    const hasShareSources = (shareNativeTarget.buildPhases ?? []).some((phase) => {
      if (phase.comment !== 'Sources' || !phase.value) return false
      const sourcePhase = objects.PBXSourcesBuildPhase?.[phase.value] as { files?: unknown[] } | undefined
      return Boolean(sourcePhase?.files?.length)
    })
    if (!hasShareSources) {
      project.addBuildPhase([sourcePath, storePath], 'PBXSourcesBuildPhase', 'Sources', targetUuid)
    }
    const configuredTarget = project.pbxNativeTargetSection()[targetUuid] as { buildConfigurationList: string }
    const configurationLists = project.pbxXCConfigurationList()
    const configurationList = configurationLists[configuredTarget.buildConfigurationList] as { buildConfigurations?: { value: string }[] }
    const configurations = project.pbxXCBuildConfigurationSection()
    for (const configuration of configurationList.buildConfigurations ?? []) {
      const entry = configurations[configuration.value] as { buildSettings?: Record<string, unknown> } | undefined
      const settings = entry?.buildSettings
      if (!settings) continue
      settings.CODE_SIGN_ENTITLEMENTS = `${shareTargetName}/${shareTargetName}.entitlements`
      settings.INFOPLIST_FILE = `${shareTargetName}/${shareTargetName}-Info.plist`
      settings.IPHONEOS_DEPLOYMENT_TARGET = '15.1'
      settings.PRODUCT_BUNDLE_IDENTIFIER = `${config.ios?.bundleIdentifier ?? 'com.naveyo.app'}.share`
      settings.PRODUCT_NAME = shareTargetName
      settings.SWIFT_VERSION = '5.0'
      settings.SKIP_INSTALL = 'YES'
    }
    return config
  })

  return config
}

export default createRunOncePlugin(withNaveyoDocuments, naveyoDocumentsPluginName, naveyoDocumentsPluginVersion)

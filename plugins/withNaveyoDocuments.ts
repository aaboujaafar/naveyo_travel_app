import { createRunOncePlugin, withDangerousMod, withEntitlementsPlist, withXcodeProject, type ConfigPlugin } from 'expo/config-plugins'
import fs from 'node:fs'
import path from 'node:path'

export const naveyoDocumentsPluginName = 'with-naveyo-documents'
export const naveyoDocumentsPluginVersion = '0.2.0'

const shareTargetName = 'NaveyoShare'
const appGroup = 'group.com.naveyo.app'

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
    fs.writeFileSync(path.join(targetRoot, `${shareTargetName}-Info.plist`), JSON.stringify({
      CFBundleDisplayName: 'Naveyo',
      CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
      CFBundleShortVersionString: '$(MARKETING_VERSION)',
      CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
      NSExtension: {
        NSExtensionPointIdentifier: 'com.apple.share-services',
        NSExtensionPrincipalClass: '$(PRODUCT_MODULE_NAME).NaveyoShareViewController',
        NSExtensionAttributes: {
          NSExtensionActivationRule: {
            NSExtensionActivationSupportsAttachmentsWithMaxCount: 1,
            NSExtensionActivationSupportsImageWithMaxCount: 1,
            NSExtensionActivationSupportsText: true,
            NSExtensionActivationSupportsWebURLWithMaxCount: 1,
            NSExtensionActivationSupportsMovieWithMaxCount: 0,
            NSExtensionActivationSupportsPDFWithMaxCount: 1,
          },
        },
      },
    }, null, 2))
    fs.writeFileSync(path.join(targetRoot, `${shareTargetName}.entitlements`), `${JSON.stringify({ 'com.apple.security.application-groups': [appGroup] }, null, 2)}\n`)
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

import { createRunOncePlugin, type ConfigPlugin } from 'expo/config-plugins'

export const naveyoDocumentsPluginName = 'with-naveyo-documents'
export const naveyoDocumentsPluginVersion = '0.1.0'

const withNaveyoDocuments: ConfigPlugin = (config) => config

export default createRunOncePlugin(withNaveyoDocuments, naveyoDocumentsPluginName, naveyoDocumentsPluginVersion)

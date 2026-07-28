import { createRunOncePlugin, type ConfigPlugin } from 'expo/config-plugins';

const withNaveyoDocuments: ConfigPlugin = (config) => config;

export default createRunOncePlugin(withNaveyoDocuments, 'with-naveyo-documents', '0.1.0');

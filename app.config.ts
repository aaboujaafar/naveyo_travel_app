import type { ExpoConfig } from 'expo/config';


const config: ExpoConfig = {
  name: 'Naveyo',
  slug: 'naveyo',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'naveyo',
  userInterfaceStyle: 'automatic',
  ios: {
    deploymentTarget: '18.0',
    supportsTablet: false,
    bundleIdentifier: 'com.naveyo.app',
    infoPlist: {
      LSApplicationQueriesSchemes: ['whatsapp']
    }
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    './plugins/withNaveyoTracking',
    './plugins/withNaveyoDocuments'
  ],
  experiments: {
    typedRoutes: true
  }
};

export default config;

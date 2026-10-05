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
    './plugins/withNaveyoDocuments',
    './plugins/withNaveyoSceneLifecycle',
    [
      'expo-media-library',
      {
        photosPermission: 'Naveyo propose les photos prises pendant le Voyage pour créer vos stories. Elles restent sur l’iPhone.',
        savePhotosPermission: 'Naveyo enregistre les stories créées dans votre photothèque.',
        isAccessMediaLocationEnabled: true
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  }
};

export default config;

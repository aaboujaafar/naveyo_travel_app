import { createRunOncePlugin, type ConfigPlugin } from 'expo/config-plugins';

const withNaveyoTracking: ConfigPlugin = (config) => config;

export default createRunOncePlugin(withNaveyoTracking, 'with-naveyo-tracking', '0.1.0');

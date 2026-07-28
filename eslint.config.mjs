import expo from 'eslint-config-expo/flat.js';

export default [
  ...expo,
  {
    ignores: ['.expo/**', 'node_modules/**', 'ios/**', 'android/**'],
    rules: {
      // React Native Animated.Value is intentionally held in a ref.
      'react-hooks/refs': 'off'
    }
  }
];

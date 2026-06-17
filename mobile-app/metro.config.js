const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const nodeModules = path.resolve(__dirname, 'node_modules');

// Expo SDK 54 enables unstable_enablePackageExports=true with conditions
// ["react-native"] for Android/iOS. Neither @firebase/app nor @firebase/component
// have a "react-native" export condition, so Metro falls to different conditions
// depending on the caller:
//   - ES `import '@firebase/app'`  → "default" → ESM build
//   - CJS `require('@firebase/app')` (inside @firebase/auth rn bundle) → "require" → CJS Node.js build
// This creates two @firebase/app instances with separate _components registries.
// @firebase/auth registers "auth" in the CJS registry; initializeApp stores the
// FirebaseApp in the ESM registry → "Component auth has not been registered yet".
//
// Fix:
//   1. Force @firebase/app to ESM for all callers → single instance, registers
//      as '' (browser) variant, not 'node' → Firebase allows phone auth.
//   2. Force @firebase/component to CJS for all callers → single singleton
//      ComponentContainer shared across all Firebase packages.

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@firebase/app') {
    return {
      filePath: path.join(nodeModules, '@firebase/app/dist/esm/index.esm2017.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === '@firebase/component') {
    return {
      filePath: path.join(nodeModules, '@firebase/component/dist/index.cjs.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

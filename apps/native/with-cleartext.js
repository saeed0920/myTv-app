const { withAndroidManifest, withAppBuildGradle } = require('expo/config-plugins');

module.exports = config => withAppBuildGradle(withAndroidManifest(config, config => {
  config.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
  return config;
}), config => {
  config.modResults.contents = config.modResults.contents.replace(/^android \{$/m, `android {
    splits {
        abi {
            reset()
            enable true
            universalApk false
            include 'armeabi-v7a', 'arm64-v8a', 'x86_64'
        }
    }`);
  return config;
});

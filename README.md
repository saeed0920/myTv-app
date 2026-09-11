# myTv

Native Android companion for SEI610 MediaBox. myTv finds a compatible box on the same Wi-Fi network, connects without requiring its IP address, and provides playback controls from a phone.

## Features

- Automatic MediaBox discovery on the local network
- Saved-device reconnect and manual address fallback
- Play, pause, stop, seek, volume, and mute controls
- Send media URLs to TV with quality selection
- Browse, play, and delete MediaBox library files
- Light and dark themes
- No cloud account or internet exposure

## Requirements

- Bun
- Android device or emulator
- MediaBox API available on port `8080`
- Phone and MediaBox connected to same Wi-Fi network

## Development

```bash
bun install
bun run dev:native
```

Open project using Expo development client, Android emulator, or connected Android device.

Type-check workspace:

```bash
bun run check-types
```

## Build APK locally

Android SDK and Java 17 are required.

```bash
cd apps/native
bunx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease
```

APK output:

```text
apps/native/android/app/build/outputs/apk/release/app-release.apk
```

## GitHub APK releases

Workflow at `.github/workflows/android-apk.yml` builds APK in GitHub Actions.

Run it manually from repository Actions page to download APK as workflow artifact, or push version tag to publish APK under GitHub Releases:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Published file appears as `myTv.apk` in tagged GitHub release.

## Project structure

```text
apps/native/
├── app/                 Expo Router screens
├── components/          Shared UI components
├── contexts/            Theme and MediaBox connection state
├── lib/api.ts           API client and LAN discovery
└── global.css           Uniwind theme tokens
```

## Current scope

Current release focuses on discovery, remote playback controls, and media library access. Photo slideshow, subtitles, Bluetooth management, Wi-Fi controls, infrared controls, and screen casting remain planned work.

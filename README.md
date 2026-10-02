# myTv

Native Android companion for SEI610 MediaBox. myTv finds a compatible box on the same Wi-Fi network, connects without requiring its IP address, and provides playback controls from a phone.

## Features

- Automatic MediaBox discovery on the local network
- Saved-device reconnect and manual address fallback
- Play, pause, stop, seek, volume, and mute controls
- Send media URLs with source/audio/quality, 30 FPS and proxy options
- Choose phone videos, images or audio → upload and play on TV
- Batch library uploads with progress/cancel; safe uploads never overwrite existing files
- Browse, play, download/open/share, and delete MediaBox library files
- Temporary photo slideshow with previous/next and explicit cleanup
- Xray/V2Ray share-link, custom HTTP proxy and direct playback settings
- Bluetooth pairing visibility and paired-device controls
- Optional TV-frame preview, paused when screen unfocused/app backgrounded
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
apps/native/android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
apps/native/android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk
apps/native/android/app/build/outputs/apk/release/app-x86_64-release.apk
```

## GitHub APK releases

Workflow at `.github/workflows/android-apk.yml` builds APK in GitHub Actions.

Every push to `main` builds an APK. Download `myTv-apks` from latest successful **Actions → Android APK** run. Choose `myTv-arm64-v8a.apk` for most modern phones, `myTv-armeabi-v7a.apk` for 32-bit phones, or `myTv-x86_64.apk` for emulators. Run workflow manually for another build, or push version tag to publish APK under GitHub Releases:

```bash
git tag v1.1.0
git push origin v1.1.0
```

Tagged releases contain the three ABI-specific APKs. Version lives in `apps/native/app.json` (1.1.0, Android versionCode 3 / iOS buildNumber 3) and `apps/native/package.json`. Increase native build numbers for each release; Box screen displays app version. Android HTTP access is enabled by `apps/native/with-cleartext.js` during Expo prebuild; reinstall newly built APK after native config changes.

## Project structure

```text
apps/native/
├── app/                 Expo Router screens
├── components/          Shared UI components
├── contexts/            Theme and MediaBox connection state
├── lib/api.ts           API client and LAN discovery
├── with-cleartext.js    Allow HTTP to LAN box in generated Android manifest
└── global.css           App theme styles
```

## How phone connects

`apps/native/contexts/server-context.tsx` starts discovery. `apps/native/lib/api.ts` probes saved address, `mediabox.local:8080`, then port 8080 across phone's IPv4 /24 network. It recognizes only `/api/info` returning `id: sei610-mediabox`. Use **Box → Connect address** with box IP (for example `192.168.1.4:8080`) if scanning fails. Browser reachability alone does not prove an old APK permits cleartext HTTP; install current Actions artifact. Box server runs independently under systemd; see parent Armbian repository `README.md` for deployment, boot checks, and media storage `/srv/media`.

## Current scope

v1.1.0 matches existing website features and adds phone file selection plus temporary photo slides. Subtitles, Wi-Fi/IR management and true screen mirroring remain separate work; sending a file is upload-then-play, not screen casting.

### Box update required

Deploy matching parent repository `controller.py` using `../deploy.sh user@box` from app directory (requires sudo; restarts playback). Upload buttons require `/api/info` capabilities `safe-upload`; slideshow requires `slides`. Older controllers still support remote/library controls, proxy and Bluetooth.

- Persistent uploads: `/srv/media`, raw PUT, max 32 GiB. Existing filenames return 409; rename source or explicitly delete old file. Interrupted uploads are removed and hidden while incomplete.
- Temporary slides: `PUT /slides/<image-name>`, max 20 MiB, JPG/PNG/WebP/GIF/BMP. One shared box session; current photo is replaced on next, cleared by End, new media playback, or controller restart. `/run/media/slides` must be on RAM-backed `/run` (normal Armbian setup); verify with `findmnt -T /run/media`. Photos are never added to library. Abandoned slide stays in RAM until cleared/restart.
- Phone uses OS document picker; no broad gallery permission. Selected files are copied into phone cache for native streaming uploads; large videos require free phone cache and box space.
- Downloads use phone cache and OS share sheet: choose player or save destination. Phone codec support determines playback.
- Proxy affects box playback only, not phone networking. Settings may contain credentials: avoid sharing screenshots.
- No auth: trusted LAN only, never port-forward controller.

### Checks

```bash
bun run check-types
cd apps/native && bunx expo export --platform android --output-dir /tmp/mytv-export
# In parent repository:
python3 controller.py --check
python3 test_controller.py
```

Real Android + box checks still required: picker, progress/cancel, download/share, slide cleanup, Bluetooth, preview background behavior and both themes/large text. Current environment has no attached Android device; Metro export is not a native APK/device test.

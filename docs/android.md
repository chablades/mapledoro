# Android App

The Android app is a thin [Capacitor](https://capacitorjs.com) wrapper: the WebView
loads the live site at `https://mapledoro.com` directly (see `server.url` in
`capacitor.config.ts`). No web build is bundled and there is no offline support —
the `capacitor-www/` folder is just a placeholder to satisfy Capacitor's required
`webDir` setting.

## Building locally

Requirements: Android Studio (with an Android SDK) and JDK 21 or newer
(Capacitor 8 compiles against Java 21).

```sh
npm ci
npx cap sync android
npx cap open android   # opens the project in Android Studio
```

From Android Studio you can run the app on an emulator or connected device.
Local release builds (`./gradlew assembleRelease` in `android/`) are **unsigned**
unless you provide the signing env vars listed below.

## Release workflow

Pushing a tag matching `v*` triggers `.github/workflows/build-apk.yml`, which:

1. Runs `npm ci` and `npx cap sync android`.
2. Decodes the `KEYSTORE_BASE64` repository secret into `android/app/release.jks`.
3. Builds a signed release APK with `./gradlew assembleRelease`, using the
   `KEYSTORE_PASSWORD`, `KEY_ALIAS`, and `KEY_PASSWORD` secrets.
4. Attaches the APK to the GitHub Release for that tag.

Required repository secrets:

| Secret | Value |
| --- | --- |
| `KEYSTORE_BASE64` | The release keystore, base64-encoded (`base64 -w0 release.jks`) |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Key alias inside the keystore |
| `KEY_PASSWORD` | Password for that key |

The keystore itself is never committed — `*.jks` / `*.keystore` are gitignored.
Keep a secure backup of it: APK updates must be signed with the same key.

## Installing the APK

The APK is distributed via GitHub Releases, not the Play Store. Side-loading it
requires enabling "Install from unknown sources" (Android: Settings → Apps →
Special app access → Install unknown apps, then allow your browser or file
manager).

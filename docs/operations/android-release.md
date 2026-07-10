# Android App (Capacitor) Packaging & Release Runbook [ID: OPS-ANDROID-RELEASE]

This runbook outlines the workflow for compiling, signing, testing, and releasing the LocalGameGalaxy Android app via Capacitor.

---

## 1. Prerequisites & Environment Setup

Before building the Android package, ensure the host machine has the following dependencies:

1. **Java Development Kit (JDK)**: JDK 17 (required by Android Gradle Plugin).
   - Check version: `java -version`
2. **Android Studio & SDK**: Install Android Studio and compile-tools. Ensure `$ANDROID_HOME` is exported in your environment:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
   ```

---

## 2. Synchronization Workflow

Capacitor requires copying Vite web assets into the native Android folder structure before compiling.

```bash
# Step 1: Compile Vite production web bundle
npm run build

# Step 2: Sync web assets and plugin bindings to the android folder
npx cap sync
```
*Note: Run `npx cap sync` every time you modify files in `src/` to ensure changes compile in Android.*

---

## 3. Creating Release Keystores (Signing)

A signed release build is required to install the app on devices or publish to Google Play.

1. **Generate a keystore file**:
   ```bash
   keytool -genkey -v -keystore localgamegalaxy.keystore -alias lgg-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Save this keystore file safely. Do **not** commit the keystore file to Git.

---

## 4. Compiling a Release APK/AAB

### Method A: Gradle CLI (Recommended for CI/CD)
To compile a signed release APK directly from terminal:
```bash
cd android/
./gradlew assembleRelease
```
Outputs: `android/app/build/outputs/apk/release/app-release-unsigned.apk`.

To align and sign the APK:
```bash
apksigner sign --ks localgamegalaxy.keystore --ks-key-alias lgg-alias --out release.apk app-release-unsigned.apk
```

### Method B: Android Studio GUI
1. Run `npx cap open android` to launch Android Studio.
2. Select **Build > Generate Signed Bundle / APK...**
3. Select **APK** or **Android App Bundle (AAB)**.
4. Input keystore path, password, and alias.
5. Select **release** build variant and click **Finish**.

---

## 5. Device Verification & Native Controls

### Testing hardware back button:
Android devices have a hardware back button (or gesture navigation swipe). In `Capacitor` apps, pressing the back button by default exits the application. LocalGameGalaxy overrides this behavior to close overlays, drawer views, and active modals:

1. Connect phone via USB with developer mode enabled.
2. Compile and run in debug mode: `npx cap run android`.
3. Open a modal dialog (e.g. settings panel or custom role editor).
4. Tap the hardware back button.
5. **Expected result**: The dialog closes. The main application remains active.
6. Verify back button events listener registration in `App.tsx` (using `@capacitor/app` package):
   ```typescript
   import { App } from '@capacitor/app';
   App.addListener('backButton', ({ canGoBack }) => {
       // Close modal or router back
   });
   ```

---

## 6. SSL Certificate Handshake Errors in WebView
The Android WebView blocks self-signed certificates by default, preventing the phone app from connecting to local servers serving local SSL keys.
- **For local testing**: Ensure the developer phone trusts the local certificate authority, or use local developer settings to bypass SSL check (see [troubleshooting.md](file:///home/deck/Projects/LocalGameGalaxy/docs/operations/troubleshooting.md)).

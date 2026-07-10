# ADR-0003: Use Capacitor for Android App Packaging

## Status
Accepted

## Context
LocalGameGalaxy is a web application. However, native Android features (screen wake lock, screen orientation locking, status bar hiding, safe area insets for edge-to-edge displays) are required for the phone client experience. Building and maintaining a separate native Android codebase would duplicate significant logic.

## Decision
Use **Capacitor** (`@capacitor/core`, `@capacitor/android`) to package the web application as a native Android APK. Native plugins (`@capacitor/status-bar`, `@capacitor/splash-screen`, `capacitor-plugin-safe-area`) provide access to device APIs.

## Alternatives Considered
- **PWA only**: Progressive Web Apps lack access to critical native APIs (orientation lock, wake lock with guarantee, full status bar control) on Android.
- **React Native**: Would require rewriting the entire UI in React Native components — a full application rewrite not justified by the scope of native API usage.
- **Cordova**: Older predecessor to Capacitor; less actively maintained with slower plugin ecosystem updates.

## Consequences
**Positive**:
- The entire web codebase is reused as-is; only plugin calls differ.
- Full access to native Android APIs via JavaScript bridge.
- Capacitor CLI (`npx cap sync`) keeps the native project in sync with web builds.

**Negative**:
- Android SDK and Android Studio must be installed to build the APK.
- Edge-to-edge display insets require explicit CSS handling (see `docs/tech/styling.md`).
- WebView limitations (no `SharedArrayBuffer` without specific response headers) may constrain some advanced audio APIs.

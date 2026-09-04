# Implementation Plan: Hybrid Push Notifications (Web Push + ntfy) [ID: PLAN-HYBRID-PUSH-001]

## Goal Description
Provide seamless asynchronous turn notifications for all users:
1. Standard Web Push (Chrome, Firefox, Safari) using VAPID / PushManager.
2. 100% De-Googled Push via ntfy (`ntfy.sh` / self-hosted) for users on Fairphone, Murena /e/OS, GrapheneOS, or users who reject Google Play Services / FCM.
3. Hybrid fallback & autodetection in frontend and Cloudflare Worker push relay.
4. User preference storage (`auto`, `webpush`, `ntfy`, `both`) with in-app testing for both notification types.

## Proposed Changes

### 1. Cloudflare Worker Push Relay (`server/cloudflare-push-relay/`)
- `worker.ts`:
  - Enhance `/subscribe` to accept `preferredMethod?: 'webpush' | 'ntfy' | 'both'` and optional `ntfyTopic?: string`.
  - Enhance `/notify` to:
    - Send Web Push to subscribed targets (with graceful error handling).
    - Dispatch HTTP POST to ntfy for target player topics (e.g. `lgg-${gameId}-${targetPlayerId}` and/or `lgg-${gameId}`).
    - Support configurable `NTFY_SERVER` (defaults to `https://ntfy.sh`).
    - Return delivery summary for both Web Push and ntfy channels.
  - Enhance `/health` to report ntfy status and configuration.

### 2. Client Push Architecture (`src/lib/push/`)
- `pushTypes.ts`:
  - Add notification method types (`NotificationMethod = 'auto' | 'webpush' | 'ntfy' | 'both'`).
  - Add ntfy configuration interfaces and payload fields.
- `pushClient.ts`:
  - Implement deterministic ntfy topic generation (`getNtfyTopic`, `getNtfyUrl`, `getNtfyAppScheme`).
  - Add `sendNtfyNotification` (direct fallback or test ping).
  - Update `registerForGamePush` with try/catch fallback: if Web Push subscription throws (e.g. deGoogled push service error), gracefully fall back to ntfy and notify the caller.
  - Update `sendGamePushNotification` to notify relay with hybrid payload and fall back to direct ntfy if relay is unavailable.
- `storage.ts`:
  - Add storage keys and accessors for `NOTIFICATION_METHOD` and `NTFY_SERVER_URL`.

### 3. UI Components & Game Dialogs (`src/components/push/`, `src/games/`)
- `PushNotificationBanner.tsx`:
  - Add dual-tab / toggle view: "Browser-Push" vs "Google-frei (ntfy)".
  - Detect Web Push errors (e.g. missing FCM/Play Services) and automatically suggest ntfy.
  - Add "In ntfy abonnieren" button (opens `ntfy://` or `https://ntfy.sh/...`) and test button for ntfy.
- `NotificationSettings.tsx`:
  - Add selector for Notification Channel (`Auto`, `Web Push`, `ntfy (Google-frei)`, `Beides`).
  - Add ntfy server URL configuration (default `https://ntfy.sh`).
  - Add test buttons for both Web Push and ntfy.
- `ShareStoryLinksDialog.tsx` & `SharePlayerLinksDialog.tsx`:
  - Add ntfy subscription action / QR code alongside standard game links.

### 4. Internationalization (`public/locales/de/` and `public/locales/en/`)
- Add all translation strings for ntfy, hybrid push modes, test prompts, and Google-free descriptions.

## Verification Plan
1. Unit/Integration logic: verify ntfy URL generation and fallback behavior.
2. Compile and lint check: `npm run lint` and `npm run build`.
3. Worker test: Verify Cloudflare worker handles `/notify` with ntfy dispatch and CORS.
4. Test notification dispatch directly to `ntfy.sh` test topic and verify HTTP 200.

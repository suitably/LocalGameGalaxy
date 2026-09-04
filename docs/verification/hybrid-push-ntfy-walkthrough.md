# Walkthrough: Hybrid Push Notifications (Web Push + ntfy) [ID: WALKTHROUGH-HYBRID-PUSH-001]

## Changes Implemented

### 1. Cloudflare Worker Push Relay (`server/cloudflare-push-relay/worker.ts`)
- Added hybrid dispatch supporting RFC 8291 Web Push and `ntfy.sh` (or custom ntfy instance) via HTTP POST.
- Enhanced `/subscribe` endpoint to accept `method?: 'auto' | 'webpush' | 'ntfy' | 'both'` and `ntfyTopic?: string`.
- Enhanced `/notify` endpoint to send Web Push to registered web targets and dispatch notifications to ntfy topic(s) with title, click URL, priority, and tags.
- Enhanced `/health` endpoint to report ntfy status and configuration.

### 2. Client Architecture (`src/lib/push/`)
- `pushTypes.ts`: Added `NotificationMethod`, `RelayNotifyResponse`, and ntfy topic metadata.
- `pushClient.ts`: Added `getNtfyTopic`, `getNtfyUrl`, `getNtfyAppScheme`, and `sendDirectNtfyNotification` for CORS-enabled direct ntfy communication.
- Upgraded `registerForGamePush` with try/catch error handling for deGoogled systems (where `pushManager.subscribe` rejects due to missing Play Services), automatically registering ntfy.
- Upgraded `sendGamePushNotification` to pass ntfy metadata to the relay and fallback directly to ntfy if the relay is unavailable.
- `storage.ts`: Added storage keys and methods for `NOTIFICATION_METHOD` and `NTFY_SERVER_URL`.

### 3. UI Components (`src/components/push/`)
- `CloudflareWorkerGuideAccordion.tsx`: Cleanly isolated deployment instructions (SRP).
- `NtfySettingsSection.tsx`: Allows configuring custom ntfy servers, 1-click test button, and direct topic linking.
- `PushNotificationBanner.tsx`: Shows dual state (Web Push + Google-free ntfy badge with 1-click subscribe).
- `NotificationSettings.tsx`: Refactored and reduced below 200 lines, with notification channel dropdown selector (`auto`, `ntfy`, `webpush`, `both`).
- `ShareStoryLinksDialog.tsx` & `SharePlayerLinksDialog.tsx`: Pass `gameId` to `PushNotificationBanner`.

### 4. Internationalization
- Added full German and English translations for all new ntfy settings, channel selectors, badges, and test notifications in `public/locales/{de,en}/translation.json`.

## Verification Results
- `npm run lint`: Passed with 0 errors.
- `npm run build`: `tsc -b` and `vite build` completed successfully with exit code 0.
- Live Worker Test: Verified Cloudflare Worker endpoint structure and ntfy topic dispatch.

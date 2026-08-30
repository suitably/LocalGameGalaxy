# GuessArt Notifications & Background Sync Improvement Plan

## Goal Description
Improve GuessArt notifications and background turn sync to address user feedback:
1. **Prevent Unwanted Notifications on Game Start**: Do not send any OS/browser notification when a new game is created/started or when the user loads into Round 1 as drawer.
2. **Prevent Notifications for Local-to-Local Turn Handoffs**: When playing on the same device (pass-and-play) where both the previous and next player are local, or when an action is executed locally by the current user on the active screen, suppress OS notifications.
3. **Reliable Remote & Background Notifications**:
   - Enable multi-game MQTT subscription so incoming remote turns are received even when the user is in the Lobby (`activeGameId === null`), navigating the app, or with the tab/app in the background.
   - Use `ServiceWorkerRegistration.showNotification()` with standard `Notification` fallback and notification tagging (`guessart-${gameId}`) to ensure notifications work reliably across Android PWA, mobile browsers, and desktop.
   - On remote turn receipt when the active turn belongs to a local player and the sender was a remote peer, trigger the notification only when appropriate (e.g. app in background or user on a different view).
4. **Full Localization (i18n)**: Externalize all notification strings into `public/locales/de/translation.json` and `public/locales/en/translation.json`.

## Architecture & Component Breakdown (SOLID Principles)
1. **Single Responsibility**:
   - `src/games/guessart/logic/notificationService.ts`: Encapsulates permission requests, checks, and robust notification dispatching (`showNotification` via SW or `window.Notification`).
   - `src/games/guessart/logic/mailboxService.ts`: Enhanced to manage multi-game topic subscriptions (`syncSubscriptions(gameIds)`) and dispatch incoming remote snapshots to a global listener.
   - `src/games/guessart/hooks/useGuessArtLobby.ts`: Syncs active game subscriptions with the mailbox service when active games change or load.
   - `src/games/guessart/GuessArtGame.tsx`: Removes raw/hardcoded `new Notification` side effects and integrates with the new notification rules.
2. **Type Safety & Clean Interfaces**: Strong TypeScript typing without `any`.
3. **i18n**: Both German (`de`) and English (`en`) translations for notification titles and bodies.

## Proposed Changes
- Create `src/games/guessart/logic/notificationService.ts`
- Update `src/games/guessart/logic/mailboxService.ts` to support multi-topic subscriptions and remote turn notifications
- Update `src/games/guessart/hooks/useGuessArtGame.ts` and `useGuessArtLobby.ts`
- Update `src/games/guessart/GuessArtGame.tsx`
- Add tests in `src/games/guessart/logic/guessartNotification.test.ts`
- Update `public/locales/de/translation.json` and `public/locales/en/translation.json`
- Update `docs/tech/architecture.md` (SSoT)

## Verification Plan
1. `npm test` (`vitest run`): Verify all existing tests and new unit tests for notification filtering and multi-game mailbox subscriptions.
2. `npm run lint`: Verify 0 errors.
3. `npm run build`: Verify TypeScript compilation and Vite production bundling.

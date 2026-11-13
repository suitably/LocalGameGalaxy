## 2026-11-13 — Notification channel chooser before the system prompt (claude-code)

- `docs/tech/architecture.md` §3.3: documents `NotificationChannelChooser` and `src/lib/push/notificationChannels.ts`; notes that "On this device" is Web Push (delivered via APNs/FCM by the browser) and that the Capacitor app has no native FCM/APNs integration.
- `docs/tech/architecture.md` §3.3, `docs/tech/persistence.md`: GuessArt and Storyteller open `NotificationChoiceDialog` instead of requesting permission on mount; new storage key `NOTIFICATION_CHOICE_DISMISSED`.

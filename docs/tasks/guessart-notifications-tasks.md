# GuessArt Notifications Improvement Tasks

- [ ] 1. Create `src/games/guessart/logic/notificationService.ts` for robust browser & SW notifications with turn decision logic <!-- id: 0 -->
- [ ] 2. Update `src/games/guessart/logic/mailboxService.ts` to support multi-game subscriptions and remote snapshot callbacks <!-- id: 1 -->
- [ ] 3. Update `useGuessArtLobby.ts` to sync active games with the mailbox service for background syncing <!-- id: 2 -->
- [ ] 4. Update `useGuessArtGame.ts` and `GuessArtGame.tsx` to remove unwanted game start / local-to-local notifications and integrate notificationService <!-- id: 3 -->
- [ ] 5. Update German and English translation files in `public/locales/` with notification strings <!-- id: 4 -->
- [ ] 6. Create unit tests in `src/games/guessart/logic/guessartNotification.test.ts` to verify notification decision rules and filtering <!-- id: 5 -->
- [ ] 7. Run `npm test`, `npm run lint`, and `npm run build` to verify correctness <!-- id: 6 -->
- [ ] 8. Update `docs/tech/architecture.md` and create walkthrough document in `docs/verification/` <!-- id: 7 -->

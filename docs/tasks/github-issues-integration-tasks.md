# GitHub Issues Integration Tasks [ID: TASK-GITHUB-ISSUES-002]

- [x] Add `githubOwner`, `githubRepo`, and `githubToken` to server configuration defaults and exports in `server/config.js` <!-- id: 1 -->
- [x] Implement secure settings configuration inputs to server admin panel in `server/public/index.html` <!-- id: 2 -->
- [x] Update `POST /api/feedback` endpoint in `server/src/routes/index.js` to accept `type` and map it to GitHub labels (`bug`, `enhancement`, `question`) <!-- id: 3 -->
- [ ] Add `feedbackOpen` and `setFeedbackOpen` state to `src/context/LayoutContext.tsx` <!-- id: 4 -->
- [ ] Create `src/components/Layout/FeedbackDialog.tsx` with type selector, form state, and submit logic <!-- id: 5 -->
- [ ] Integrate `FeedbackDialog` in `src/components/Layout/MainLayout.tsx` <!-- id: 6 -->
- [ ] Add Feedback button (using `RateReviewIcon`) to `src/components/Layout/GlobalHeader.tsx` <!-- id: 7 -->
- [ ] Update `src/features/settings/Settings.tsx` to trigger the global feedback dialog instead of displaying the inline form <!-- id: 8 -->
- [ ] Add a "Give Feedback" button to `src/games/melodiq/MelodiqSettings.tsx` to trigger the dialog <!-- id: 9 -->
- [ ] Add new i18n keys for feedback types, dialog title, and descriptions in `public/locales/en/translation.json` <!-- id: 10 -->
- [ ] Add new i18n keys for feedback types, dialog title, and descriptions in `public/locales/de/translation.json` <!-- id: 11 -->
- [ ] Run `npm run lint` and verify success <!-- id: 12 -->
- [ ] Run `npm run build` and verify successful production build <!-- id: 13 -->

# Unify Smartphone View Tasks

- [x] **Task 1**: Update `docs/planning/unify-smartphone-view-plan.md` to explicitly state Option A (no video/audio on client, only lyrics).
- [x] **Task 2**: Remove `MelodiqPhoneClient.tsx` and update imports/routes in `App.tsx`.
- [x] **Task 3**: Update `MelodiqConnection.tsx` to point the QR code URL to the main page with `?role=client&party={partyId}`.
- [x] **Task 4**: Implement `Role` (Host vs Client) detection in `MelodiqGame.tsx` and propagate it.
- [x] **Task 5**: Hide restricted UI elements (Settings, Connect Phones) for Clients in `MelodiqGame.tsx`.
- [x] **Task 6**: Update `useQueue.ts` / Queue logic to support Client mode (listening via WebRTC instead of LocalStorage).
- [x] **Task 7**: Update `PlaybackManager.tsx` and Session views to completely disable Video/Audio rendering for Clients, showing only Lyrics and Mic controls.
- [x] **Task 8**: Walkthrough & Verification to ensure smooth Host <-> Client communication.

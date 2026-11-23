## Context & Problem

Fixes #347. An earlier attempt in PR #348 failed because it mounted the desktop `<Settings>` component directly on the mobile phone client. This caused network errors (`GET http://localhost:3000/api/usdb/jobs` -> `ERR_CONNECTION_REFUSED`), polluted the client's local storage instead of the host's, and relied on untyped `window.dispatchEvent` events.

## Branch

`feat/melodiq-remote-host-settings`

## Target Files

- `docs/tech/melodiq-architecture.md` (Update OKF documentation)
- `src/games/melodiq/types.ts` (Add strict discriminated union RPC message types)
- `src/games/melodiq/components/RemoteHostSettingsModal.tsx` (New dedicated mobile presentation component, < 200 lines)
- `src/games/melodiq/hooks/useMelodiqHeader.tsx` (Show "Host Settings" only for `clientRole === 'admin'`)
- `src/games/melodiq/hooks/useMelodiqGlobalEvents.tsx` / `handleHostApiRequest.ts` (Handle typed settings sync)

## Implementation Steps

1. **Define Strict Remote Message Types in `types.ts`**:
   - Model remote configuration payloads with discriminated unions:
     `type RemoteCommand = { type: 'SET_GAME_VOLUME'; payload: { master: number; vocals: number } } | { type: 'UPDATE_HOST_SETTINGS'; payload: Partial<MelodiqHostConfig> }`
2. **Dedicated Mobile UI (`RemoteHostSettingsModal.tsx`)**:
   - Do NOT mount the global desktop `<Settings>` component on the phone.
   - Build a lightweight modal containing only host-relevant adjustments (e.g., sound volume, display mode, pitch tolerance).
   - Sliders/toggles dispatch remote WebRTC commands over the existing connection channel, instead of modifying the phone's local storage or querying `localhost:3000`.
3. **Host Ingestion**:
   - When the host receives `UPDATE_HOST_SETTINGS`, apply updates to the host's `MelodiqSettings` state and broadcast updated state back to connected participants.
4. **Update OKF**:
   - Add a section in `docs/tech/melodiq-architecture.md` detailing the client-to-host WebRTC RPC schema.

## Acceptance Criteria

- [ ] Admin phones can adjust host settings without triggering any `localhost:3000` or network connection errors.
- [ ] Non-admin phones cannot see or trigger host settings.
- [ ] Zero usage of `(e: any)` or untyped `window.dispatchEvent` for settings sync.
- [ ] New component `RemoteHostSettingsModal.tsx` is under 200 lines.
- [ ] All quality gates pass (`npm run quality-gates`).

## Verification

```bash
npm run check:architecture:diff
npm run check:budget
npm run check:docs
npm test
npm run lint
```

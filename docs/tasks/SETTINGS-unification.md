---
type: Task
title: 'Settings unification: app settings vs. game settings (one PR)'
description: 'Implementation spec for the settings unification plan: typed settings routes, shared settings UI kit, registry-driven game settings, master–detail settings page, in-game settings sheet, Melodiq/Melodiq Notes/Wordle/Darts migration.'
tags: [settings, ux, navigation, melodiq, melodiq-notes, wordle, darts]
status: draft
generated:
  at: 2026-10-26T14:00:00+01:00
  by: claude-code
verified:
  at: 2026-10-26
  method: 'Derived from docs/reports/2026-10-26-settings-unification-plan.md; file list from grep for /settings callers, settings dialogs and registry fields on branch claude/settings-struktur-plan-ougni3.'
sources:
  - 'docs/reports/2026-10-26-settings-unification-plan.md'
---

# Settings unification (one PR)

Background, target model and maintainer decisions D1–D6: [plan report](../reports/2026-10-26-settings-unification-plan.md). This spec fixes the concrete contracts. Branch `claude/settings-struktur-plan-ougni3`. Rules: AGENTS.md §4 (no cross-game imports, storage via `src/lib/storage.ts`, no native dialogs, new `.tsx` ≤ 250 lines, no `any`, i18n `de` + `en`, theme tokens only).

## Contracts

### C1 — Routes (`src/features/settings/settingsRoutes.ts`, pure, Vitest)

```ts
export type AppSettingsSection =
  'general' | 'audio' | 'connectivity' | 'notifications' | 'integrations' | 'about';
export type SettingsHighlight =
  'pat' | 'usdb' | 'language' | 'appearance' | 'signaling' | 'companion' | 'setup';
export type SettingsTarget =
  | { kind: 'list' }
  | { kind: 'app'; section: AppSettingsSection; highlight?: SettingsHighlight }
  | { kind: 'game'; gameId: string; section?: string; highlight?: string };
export function settingsPath(target: SettingsTarget): string;
// '/settings' | '/settings/connectivity?highlight=usdb' | '/settings/games/melodiq/gameplay'
export function parseSettingsLocation(
  pathname: string,
  search: string,
): SettingsTarget & { pairing?: { serverUrl: string; code: string } };
```

- Route patterns: `/settings`, `/settings/:section`, `/settings/games/:gameId`, `/settings/games/:gameId/:section`. Unknown section → `{ kind: 'list' }`.
- **Only legacy rule (D6):** `pair` + `code` in the query (any `/settings` path, incl. old `/settings?tab=server&pair=…&code=…`) → `{ kind: 'app', section: 'connectivity', pairing }`. Every other old param (`tab`, `sub`, `section`, `game`, `missing_pat`, `missing_usdb`) is ignored.
- `highlight` replaces `missing_pat` (→ `pat`, shows the "GitHub connection required" alert) and `missing_usdb` (→ `usdb`, shows the missing-USDB banner). The page scrolls to `id="settings-section-<highlight>"` and focuses it.
- Return path: router `state.from` (existing convention in `useHomeNavigation.ts`).

### C2 — Settings UI kit (`src/components/settings/`)

- Move `SettingSwitch`, `SettingSlider`, `SettingToggleGroup` from `src/games/melodiq/components/GameSettingsControls.tsx` here (`SettingControls.tsx`); Melodiq imports them from here; delete the old file.
- Add: `SettingsSection` (Paper card: `id`, `title`, optional `description`, `icon`, children; uses `settingsCardSx` style moved/re-exported from here), `SettingRow` (label + helper left, control right), `SettingsResetButton` (opens `ConfirmDialog`, then calls `onReset`), `index.ts`.

### C3 — Stored settings hook (`src/hooks/useStoredSettings.ts`, Vitest)

`useStoredSettings<T extends object>(key: StorageKey, defaults: T, isValid?: (v: unknown) => v is T)` → `{ value, update(patch), reset() }`, reads/writes via `storage.getJson/setJson`, merges stored values over defaults. Same-key instances stay in sync (subscribe to a module-level emitter + the `storage` window event). Adopt in Wordle for `WORDLE_DICTIONARY_ONLY` only if the key's stored format (boolean) stays readable; otherwise keep Wordle's loader and use the hook for new code only.

### C4 — Registry contract (`src/lib/gameRegistry.tsx`)

```ts
export type GameSettingsAudience = 'host' | 'client' | 'all'; // default 'all'
export interface GameSettingsSectionDefinition {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  component: React.LazyExoticComponent<React.ComponentType>;
  audience?: GameSettingsAudience;
}
// GameDefinition: replace `hasSettings?: boolean` with
settings?: { sections: GameSettingsSectionDefinition[] };
```

- Section components live in the game (`src/games/<id>/settings/*Section.tsx`), are self-contained (read/write their own storage or context, no props) and are exported via the game's `index.ts`; the registry lazy-imports them with the existing `pick` helper.
- Registered: `wordle` → `gameplay`; `melodiq-notes` → `sounds`; `melodiq` → `profiles` (all), `gameplay` (host), `client` (client; former `ClientSettings` content without its own back button). Darts registers none (see C7).
- Registry test: section ids unique per game.

### C5 — Settings page (master–detail, D1/D2)

- `App.tsx`: `settings/*` route → `Settings`. `Settings.tsx` uses `parseSettingsLocation(useLocation())`.
- `SettingsPageLayout`: ≥ `md` left rail (list) + detail pane; < `md` list page, detail page with back to the list. GlobalHeader on settings pages shows only back + title (remove `SettingsHeaderToolbar`/`SettingsHeaderSubNav` usage). Back: detail on phone → list; list (or desktop) → `state.from` / hub (`useHomeNavigation`).
- Fixed groups and order (rail shows them with icon + label):
  1. `general` — Language card, Appearance card (from `GeneralSettings.tsx`, `AppearanceSettings.tsx`)
  2. `audio` — Audio input (C8)
  3. `connectivity` — `ServerPairingCard`, `SignalingSettingsCard`, `CompanionPluginsSection` (`autoFocusUsdb` = `highlight === 'usdb'`), `ServerSetupCard` (body of `ServerSettingsCategory.tsx`); pairing params from C1 go to `useServerPairing` (adapt its param reading)
  4. `notifications` — `NotificationSettingsCategory`
  5. `integrations` — `GitHubSettings` + the missing-PAT alert (when `highlight === 'pat'` or no config)
  6. **Games** — one entry per registry game with `settings`, hub order; game page = its sections (audience `host`/`all`) stacked as cards with `id="settings-section-<sectionId>"`
  7. `about` — app version (if already available, else omit) + "Feedback & bug report" row: button dispatches `feedback:open`, or, without GitHub config, navigates to `settingsPath({kind:'app',section:'integrations',highlight:'pat'})` (D4)
- Delete: `settingsNav.ts` (+ test), `components/nav/*` (toolbar, sub-nav, nav model, menu items, styles, `useSettingsNavUpdate`), `SettingsHeaderNav.tsx`, `melodiq_subtab_change`, `MelodiqSettingsCategory.tsx`, `MelodiqSettingsParts.tsx`, `MelodiqNotesSettingsCategory.tsx` (+ `melodiqNotesInstruments.ts` moves into melodiq-notes if still used), `SettingsModeContext` usage only if nothing else needs it.
- `features/settings` must not import game internals; games come only from the registry.
- Every caller of the old URLs uses `settingsPath()`: `App.tsx` (FeedbackRedirect), `FeedbackDialog.tsx`, `GlobalHeader.tsx`, `PartyServerInfoCard.tsx`, `guessart/…/PublishCatalogueTab.tsx`, `GuessArtHeaderMenu.tsx`, `melodiq-notes/…/SoundSettingsDialog.tsx` (removed by C6), `melodiq/…/LibraryEmptyState.tsx`, `melodiq/utils/usdbNavigation.ts` (+ test), `tabletop/…/PublishTabletopGameDialog.tsx`, `tabletop/…/InstalledGamesTab.tsx`. Games import `settingsPath` from `src/features/settings/settingsRoutes.ts` (or re-export it from `src/lib/` if check:architecture forbids games → features).
- `server/src/core/pairing.ts` `buildPairingUrl` → `/settings/connectivity?pair=…&code=…`; update `server/test/pairing.test.js`. `src/lib/companion/serverPairing.ts` doc comment + test.
- i18n: rail labels and new strings in `public/locales/{de,en}/translation.json`; replace literals `'GitHub (PAT)'`, `'WebRTC Signaling'`, `'Companion Plugins'`, `'Melodiq Notes'`.

### C6 — In-game settings sheet

- `src/components/settings/GameSettingsSheet.tsx`: full-screen `Dialog` < `md`, right `Drawer` ≥ `md`; title = game title + settings; renders the game's sections filtered by audience; footer link "App settings" → `/settings` with `state.from` = current location. Android back closes it first.
- `src/context/GameSettingsContext.tsx`: provider in the layout; `openGameSettings()`, and `useGameSettingsHost({ audience?: 'host' | 'client'; onClose?: () => void })` with which a game registers its audience and a close callback (e.g. Melodiq Notes reloads its sound config).
- `GlobalHeader`: one gear, always the same icon and position, hidden only on settings pages. On a game route whose registry entry has `settings` → `openGameSettings()`; elsewhere → `navigate('/settings', { state: { from } })`. Remove `hasSettings` logic.
- Remove game-owned gears/dialogs: Wordle (`WordleSettingsDialog`, gear in `HeaderActionBar`), Melodiq Notes (`SoundSettingsDialog`, menu item in `useMelodiqNotesHeader`), Melodiq (`Settings` menu item and `'Settings'` sub-view in `useMelodiqHeader` / `useMelodiqNavigation` / `MelodiqSubViews`, `isSettingsFromUrl` in `MelodiqGame.tsx`). The sections reuse the existing inner components (`SoundSettingsSection`, `GameSettingsPanel`, `UserProfilesManager`, `ClientSettings` content).

### C7 — Darts (D5)

`DartsSettings` holds mode, double-out and players of the running game → it is a round option, not a setting. Rename to `DartsGameSetupDialog`, header item label "Game setup" (new i18n key, `de`/`en`) with a non-gear icon (`TuneRounded`); keep Save/Cancel (applies several fields to a running game together). No registry `settings`.

### C8 — Audio input (D3)

- Move `src/games/melodiq/components/HardwareMicSetup.tsx` to `src/modules/audio/AudioInputSettings.tsx` (device list, enable, rename, level meter). Storage keys `MELODIQ_MIC_*` unchanged (no migration). Its strings move to `public/locales` (`settings.audio.*`).
- Melodiq keeps mic-to-player assignment in profiles. Melodiq Notes adoption of the shared selection is out of scope.

### C9 — Melodiq gameplay reset

The gameplay section keeps "Reset to defaults" (`SettingsResetButton` + `DEFAULT_SETTINGS`); the session "Undo" is dropped. `RemoteHostSettingsModal` reuses `GameSettingsPanel` only if that needs no change to the RPC payload; otherwise leave it as is and report.

## Work packages (sequential implementers)

| Pkg | Contracts                                                      | Check                                                                                              |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A   | C1, C2, C3, C4 (types + test only, no sections registered yet) | `npx vitest run src/features/settings src/hooks src/lib`, `npx tsc -b`, eslint on changed files    |
| B   | C5, C8, register sections (C4), server pairing                 | same + `cd server && npm run build && npm test`                                                    |
| C   | C6, C7, C9, Melodiq/Notes/Wordle cleanup                       | same + `npx vitest run src/games/melodiq src/games/wordle src/games/darts src/games/melodiq-notes` |

## Progress

- [ ] A
- [ ] B
- [ ] C
- [ ] Gates, docs (architecture.md, melodiq-architecture.md, CHANGELOG, log), PR

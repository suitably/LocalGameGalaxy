---
type: Report
title: 'Settings unification plan: app settings vs. game settings'
description: 'Audit of the global settings page, its header navigation and every per-game settings surface on 2026-10-26, with a target model (two scopes, one layout, one set of controls) and a slice plan to get there.'
tags: [settings, ux, navigation, melodiq, melodiq-notes, refactoring]
status: draft
generated:
  at: 2026-10-26T12:00:00+01:00
  by: claude-code
verified:
  at: 2026-10-26
  method: 'Read src/features/settings/** (Settings.tsx, settingsNav.ts, nav/*), GlobalHeader.tsx, gameRegistry.tsx, Melodiq MelodiqSubViews/useMelodiqHeader/useMelodiqNavigation, and grep for every settings dialog under src/games on branch claude/settings-struktur-plan-ougni3.'
sources:
  - 'src/features/settings/Settings.tsx'
  - 'src/features/settings/settingsNav.ts'
  - 'src/features/settings/components/nav/settingsNavModel.tsx'
  - 'src/components/Layout/GlobalHeader.tsx'
  - 'src/lib/gameRegistry.tsx'
---

# Settings unification plan

Two problems: (1) settings look and behave differently on every surface; (2) app-wide and game-specific settings are mixed, with Melodiq as a special case inside the global page. This report lists what exists, defines a target model and cuts it into PR-sized slices.

## 1. Current state (as of 2026-10-26)

### 1.1 Global settings page `/settings`

- `src/features/settings/Settings.tsx` renders one of five tabs: `general`, `server`, `notifications`, `melodiq`, `melodiq-notes` (`SettingsTabType` in `settingsNav.ts`).
- Navigation lives in the global header (`SettingsHeaderToolbar`, `SettingsHeaderSubNav`), described by `NAV_TABS` in `nav/settingsNavModel.tsx`:
  - Level 1: toolbar buttons (desktop) or one compact menu (phone).
  - Level 2: sub "pills" below the header. `general` and `server` have pills, `notifications` and `melodiq-notes` have none.
  - Melodiq is the only tab with `dropdown: true` — its subs open as a drop-down menu from the toolbar button **and** also appear as pills.
  - Sub entries either **filter** the page (Melodiq: `subTab === 'all' || subTab === 'microphones'` hides the other cards) or **scroll** to an anchor (`server` subs set `section`, `general` subs scroll via `settings-section-<sub>`). Same UI element, two behaviours.
- State is spread over query params `tab`, `sub`, `section`, `game`, `missing_usdb`, `missing_pat`, `pair`/`code`, router `state.from`, a `window` event `melodiq_subtab_change` (`useSettingsNavUpdate.ts` → `Settings.tsx`), and `window.location.pathname` (sniffed in `resolveSettingsNav`).
- Tab order changes with the origin: `desktopTabOrder(isFromMelodiq)` / `mobileTabOrder(isFromMelodiq)` move Melodiq to the front. Desktop and mobile orders differ even without Melodiq (`melodiq-notes` position).
- Labels are inconsistent: `title` "Melodiq Notes" vs. `button` "Instrument Sounds"; hard-coded labels `'GitHub (PAT)'`, `'WebRTC Signaling'`, `'Companion Plugins'`, `'Melodiq Notes'` (not via `t()`).
- `MelodiqSettingsCategory` still renders `MelodiqServerMovedNotice` for `sub=server`, a migration notice instead of a redirect. `usdbNavigation.ts` still links to `tab=melodiq&sub=server&section=usdb`.
- "Feedback & Bug Report" is a sub of General although it is an action, not a setting; "Playlists" is a sub of Melodiq although it is content management (it only shows a button that leaves the page).
- `features/settings` imports Melodiq and Melodiq Notes internals directly (`games/melodiq` index, `games/melodiq-notes/components/SoundfontProviderFields`, `useAudioSynth`), so every new game with settings would mean another hard-coded tab.

### 1.2 Game settings surfaces

| Game                | Entry point                                        | Container                                                                                                                              | Apply model                          | Shared controls                        |
| ------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------- |
| Melodiq host        | header action → `currentView = 'Settings'`         | **embeds the global `<Settings activeGameId="melodiq">`** in a sub-view, global settings header stays on (`setHeader(..., true, ...)`) | immediate + "Undo" + "Reset" buttons | `GameSettingsControls` (Melodiq-local) |
| Melodiq phone       | header action → `ClientSettings`                   | own full sub-view                                                                                                                      | immediate                            | own                                    |
| Melodiq remote host | header action → `RemoteHostSettingsModal`          | `Dialog`                                                                                                                               | immediate via RPC                    | `GameSettingsControls`                 |
| Melodiq Notes       | header menu → `SoundSettingsDialog`                | `Dialog` + link to `/settings?tab=melodiq-notes`                                                                                       | immediate                            | own (`SoundSettingsSection`)           |
| Darts               | header menu → `DartsSettings`                      | `Dialog`                                                                                                                               | **Cancel / Save**                    | own                                    |
| Wordle              | icon in `HeaderActionBar` → `WordleSettingsDialog` | `Dialog` (one switch)                                                                                                                  | immediate                            | own                                    |
| Tabletop            | editor toolbar → `TableSettingsDialog`             | `Dialog`                                                                                                                               | immediate (document props)           | own                                    |
| Others              | setup screens (`GameSetup`, lobbies)               | inline in the setup step                                                                                                               | per round                            | own                                    |

- `GameDefinition.hasSettings` (only `darts`, `melodiq`) only hides the global gear in `GlobalHeader`; it does not describe the settings.
- Header placement differs: Wordle uses its own icon bar, Darts and Melodiq Notes use header menu items, Melodiq replaces the whole view.
- Persistence is per game and ad hoc (`WORDLE_DICTIONARY_ONLY`, `MELODIQ_NOTES_SOUND_CONFIG`, Melodiq `SettingsContext`), which is fine, but defaults/reset exist only for Melodiq.

### 1.3 Problems, ranked

1. **No scope boundary.** Global page mixes app scope (language, theme, server, push) with two games; Melodiq embeds the global page and shows General/Server/Notifications tabs inside the game.
2. **One navigation element, three behaviours** (drop-down vs. pills vs. single button; filter vs. scroll).
3. **Origin-dependent ordering** — menus reorder depending on where the user came from; muscle memory breaks.
4. **Fragile state** — window events, pathname sniffing, five query params, legacy aliases (`push`, `ntfy`, `notes`, `instruments`, `signaling`, …).
5. **Inconsistent containers and apply models** for game settings (sub-view, dialog, dialog with Save).
6. **Non-settings in settings** (Feedback action, Playlists link, "moved" notice).
7. **Hard-coded coupling** `features/settings` → specific games.

## 2. Target model

### 2.1 Three scopes, three homes

| Scope                       | What belongs there                                                                                                                                      | Home                                                               | Persisted                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| **App settings**            | Affects the whole app on this device: language, appearance, connectivity (server, signaling, companion, STUN), notifications, integrations (GitHub PAT) | `/settings`, reached from the hub gear                             | `storage.ts`, app keys                |
| **Game settings**           | Preferences of one game that outlive a round: Melodiq gameplay/profiles/microphones, Melodiq Notes sounds, Wordle dictionary, Darts defaults            | in the game (gear → settings sheet) **and** `/settings/games/<id>` | `storage.ts`, one key family per game |
| **Round / session options** | Choices for the current round only: players, rules variant, roles, word list for this round                                                             | the game's setup/lobby screen — never in a settings surface        | game state                            |

Rule of thumb for classifying: "Would the user expect this to be the same next week in another game?" → app. "Same next week in this game?" → game. "Only for this round?" → setup.

Best-practice basis: platform guidelines (Android Settings, Apple HIG "Settings", Material 3 lists) all separate system/app preferences from in-context options, keep hierarchies at most two levels deep, apply changes immediately, and never reorder navigation based on context.

### 2.2 One layout for every settings surface

- **Master–detail.** `/settings` shows a grouped list of sections (desktop: left rail + content pane; phone: list → detail page with back arrow). Replaces header toolbar, drop-down and pills.
- **Fixed groups, fixed order:**
  1. General — Language, Appearance
  2. Connectivity — Companion server (pairing, setup), WebRTC signaling & STUN, Companion plugins
  3. Notifications — Web Push, ntfy
  4. Integrations — GitHub (PAT)
  5. **Games** — one row per game that declares settings (Melodiq, Melodiq Notes, Wordle, Darts, …), in hub order
  6. About & feedback — version, feedback/bug report (opens the existing feedback dialog; not a settings form)
- **Section page = stack of cards** (`SettingsSection`: title, optional description, rows). Max depth: group → section → (optional) sub-page for large editors such as profile management. No filtering, no scroll-sub-tabs.
- **Rows** (`SettingRow`): label + helper text left, control right; whole row toggles switches; status as secondary text in list rows (e.g. "Connected to 192.168.0.5").
- **Apply immediately** for preferences. Explicit Save/Cancel only for multi-field forms that validate together (server URL + token, PAT). Destructive actions → `ConfirmDialog`, placed last in the section ("Reset to defaults").
- **Reset per section** to defaults; drop the Melodiq session "Undo" (replace by a snackbar undo after reset).
- **Game settings in the game:** the gear opens a `GameSettingsSheet` (full-screen `Dialog` on phones, right-side drawer ≥ `md`) that renders **the same section components** as `/settings/games/<id>`. Footer link "App settings" (→ `/settings`, returns to the game). The game never embeds the global page.
- **Header:** one gear per context, same icon, same position (`menuItems` entry). In the hub it opens app settings; in a game with settings it opens game settings; in a game without settings it opens app settings.

### 2.3 Routes

- `/settings` (list), `/settings/:section` (e.g. `language`, `connectivity`, `notifications`, `integrations`), `/settings/games/:gameId[/:section]`.
- `?highlight=<field>` scrolls to and briefly highlights a field (replaces `section`, `missing_usdb`, `missing_pat`).
- Return path: router `state.returnTo` only (no pathname sniffing); back arrow uses it, falls back to the list.
- **Legacy URLs stay working:** `resolveSettingsNav` becomes `legacySettingsRedirect(search, state)` that maps every old `tab`/`sub`/`section` combination to a new route with `replace: true`. `/settings?tab=server&pair=…&code=…` is printed by the companion server (see `serverPairing.ts`) and must keep working indefinitely.

### 2.4 Game settings contract

Extend `GameDefinition` in `src/lib/gameRegistry.tsx` (replaces `hasSettings`):

```ts
interface GameSettingsSectionDefinition {
  id: string; // route segment, e.g. 'gameplay'
  titleKey: string; // i18n key
  icon: React.ReactNode;
  component: React.LazyExoticComponent<React.FC>; // self-contained, reads/writes its own storage
  hostOnly?: boolean; // hidden on phone clients (Melodiq)
}
interface GameDefinition {
  // …
  settings?: { sections: GameSettingsSectionDefinition[] };
}
```

- `features/settings` renders the Games group from the registry → no direct imports of game internals, new games need no settings-page change.
- Section components live in the game (`src/games/<id>/settings/*Section.tsx`) and are exported through the game's index, so there is no cross-game import and no `features → game internals` reach.
- Shared persistence helper `useStoredSettings<T>(key, defaults, migrate?)` in `src/hooks/` (typed, validates shape, `reset()`), built on `storage.ts`. Existing keys keep their names; no data migration needed.
- Shared controls move from `src/games/melodiq/components/GameSettingsControls.tsx` (`SettingSwitch`, `SettingSlider`, `SettingToggleGroup`) to `src/components/settings/` together with `SettingsSection`, `SettingRow`, `SettingSelect`, `SettingsResetButton`, `SettingsPageLayout`, `GameSettingsSheet`. Melodiq re-imports them (reuse, not a second implementation).

### 2.5 Classification of today's settings

| Today                                         | Target                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| General › Language, Appearance                | App › General                                                                                                      |
| General › Feedback                            | About & feedback (action row opening `FeedbackDialog`)                                                             |
| General › GitHub (PAT)                        | App › Integrations                                                                                                 |
| Server › Pairing, Signaling, Companion, Setup | App › Connectivity (sections in that order; Setup as last card)                                                    |
| Notifications                                 | App › Notifications                                                                                                |
| Melodiq › Microphones                         | Game › Melodiq › Microphones (decision D3)                                                                         |
| Melodiq › Profiles, Gameplay                  | Game › Melodiq › Profiles, Gameplay                                                                                |
| Melodiq › Playlists                           | removed from settings; Melodiq library view keeps playlists                                                        |
| Melodiq › `sub=server` notice                 | removed; legacy redirect to Connectivity › Companion plugins                                                       |
| Melodiq phone `ClientSettings`                | Melodiq game sheet, client variant (`hostOnly` sections hidden)                                                    |
| Melodiq `RemoteHostSettingsModal`             | same Gameplay section component, values bound to the RPC instead of local storage                                  |
| Melodiq Notes tab + `SoundSettingsDialog`     | Game › Melodiq Notes › Sounds (one component in both places)                                                       |
| Wordle `WordleSettingsDialog`                 | Game › Wordle › Gameplay                                                                                           |
| Darts `DartsSettings`                         | split: player list → setup (round option); remaining defaults → Game › Darts (decision D5)                         |
| Tabletop `TableSettingsDialog`                | stays: it edits the table document (editor property panel), not a setting; rename to `TablePropertiesDialog` later |

## 3. Slice plan

Each slice is one PR, gates per AGENTS.md §8. Order follows logic → state → UI. Sizes: S < 150 changed lines, M < 400, L > 400.

| #   | Slice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Size | Depends on | Done when                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------- | ---------------------------------------------------------------------------------------- |
| 1   | **Route model (logic).** `src/features/settings/settingsRoutes.ts`: pure `legacySettingsRedirect()` mapping every current `tab`/`sub`/`section`/`game` combination (incl. `pair`/`code`, `missing_*`) to the new routes; table-driven Vitest covering all aliases from `resolveSettingsNav`. No UI change.                                                                                                                                                                                              | S    | —          | test lists every alias in today's `resolveSettingsNav`                                   |
| 2   | **Shared settings UI kit.** Move `SettingSwitch`/`SettingSlider`/`SettingToggleGroup` to `src/components/settings/`, add `SettingsSection`, `SettingRow`, `SettingSelect`, `SettingsResetButton`; Melodiq imports from there. Pure move + additions, no visual change in Melodiq.                                                                                                                                                                                                                       | M    | —          | `check:duplicates` unchanged, Melodiq screens identical                                  |
| 3   | **`useStoredSettings<T>` hook** in `src/hooks/` with defaults, shape guard, `reset()`; tests. Adopt in Wordle (smallest) as proof.                                                                                                                                                                                                                                                                                                                                                                      | S    | —          | Wordle dictionary toggle uses it, key unchanged                                          |
| 4   | **Registry contract.** `settings?: { sections }` on `GameDefinition`; keep `hasSettings` derived (`Boolean(def.settings)`) for `GlobalHeader` until slice 9. Register Wordle and Melodiq Notes sections.                                                                                                                                                                                                                                                                                                | S    | 3          | `gameRegistry` test asserts section ids unique per game                                  |
| 5   | **Settings shell.** `SettingsPageLayout` (rail/list + detail), new nested routes in `App.tsx`, legacy redirect from slice 1 on `/settings?…`. App sections reuse existing cards (`GeneralSettings` split into Language/Appearance, `ServerSettingsCategory` → Connectivity, `NotificationSettingsCategory`, `GitHubSettings`). Header shows only title + back. Remove `SettingsHeaderToolbar`, `SettingsHeaderSubNav`, `settingsNavModel`, `melodiq_subtab_change`, `desktopTabOrder`/`mobileTabOrder`. | L    | 1, 2       | all old deep links (grep `'/settings`) land on the right section; pairing QR still pairs |
| 6   | **Games group** in the shell from the registry (`/settings/games/:gameId/:section`). Melodiq Notes moves here (delete `MelodiqNotesSettingsCategory`, reuse `SoundSettingsSection`).                                                                                                                                                                                                                                                                                                                    | M    | 4, 5       | no import of `games/*` internals left in `features/settings` (check:architecture)        |
| 7   | **`GameSettingsSheet`** (responsive Dialog/Drawer) rendering a game's registered sections + "App settings" link; adopt in Wordle and Melodiq Notes (replaces `WordleSettingsDialog`, `SoundSettingsDialog`).                                                                                                                                                                                                                                                                                            | M    | 4          | gear in both games opens the sheet; same component as on `/settings/games/<id>`          |
| 8   | **Melodiq migration.** Sections `microphones`, `profiles`, `gameplay` (host) registered; Melodiq gear opens `GameSettingsSheet`; delete the `Settings` embed in `MelodiqSubViews`, `MelodiqSettingsCategory`, `MelodiqServerMovedNotice`; `ClientSettings` becomes the client variant; `RemoteHostSettingsModal` renders the Gameplay section bound to RPC; Undo → snackbar after reset; fix `usdbNavigation.ts` link.                                                                                  | L    | 6, 7       | Melodiq never shows app tabs; host, phone and remote-host share one Gameplay component   |
| 9   | **Darts + header consistency.** Darts split per D5; one gear rule in `GlobalHeader` (game with settings → sheet, else app settings); drop `hasSettings`; Wordle gear moves from `HeaderActionBar` to the header menu.                                                                                                                                                                                                                                                                                   | M    | 7          | every game: same gear icon/position                                                      |
| 10  | **Cleanup + docs.** Hard-coded labels → i18n (`de`/`en`), remove legacy aliases that no longer occur in code (keep redirect table), update `docs/tech/architecture.md` (settings section), `docs/tech/melodiq-architecture.md`, CHANGELOG.                                                                                                                                                                                                                                                              | S    | 5–9        | `check:docs` green, no `'GitHub (PAT)'`-style literals                                   |

Slices 1–4 are independent and can run in parallel; 5 is the only big UI switch. Each slice keeps the app working (no dead links between slices because of the redirect table).

### Testing per slice

- Logic: Vitest for `legacySettingsRedirect`, `useStoredSettings`, registry invariants.
- UI: existing component tests for moved controls; a routing test that renders `/settings?tab=melodiq&sub=gameplay` and asserts the Melodiq Gameplay section.
- Manual (`npm run dev`): phone width 360 px and desktop; Android back button closes the sheet before leaving the game (AGENTS.md §7).

## 4. Decisions needed from the maintainer

- **D1 — Layout.** Master–detail (recommended) vs. keeping header tabs but unified (every tab = page, subs always scroll anchors, no drop-down). Master–detail scales to N games; header tabs do not.
- **D2 — Game settings on the global page.** Recommended: yes, as the "Games" group (discoverability, one place to reset). Alternative: only inside each game.
- **D3 — Microphones scope.** Melodiq and Melodiq Notes both use the mic (`useMicPitch`, stage input). Keep under Melodiq (status quo) or promote to an app section "Audio input" that both games read? Recommended: app section once Notes needs a device picker; until then Melodiq.
- **D4 — Feedback placement.** Recommended: "About & feedback" row opening the existing dialog; header feedback icon stays.
- **D5 — Darts.** Players are round options → move to setup; keep Save/Cancel only if remaining options must validate together.
- **D6 — Legacy URLs.** Keep the redirect table permanently (cheap) or drop aliases after one release? `pair` links must stay regardless.

## 5. Risks

- Pairing QR/links printed by older companion servers → covered by the permanent redirect.
- Melodiq `SettingsContext` broadcasts settings over `BroadcastChannel` (Q4); moving the UI must not change that channel's payload — slice 8 touches UI only.
- `GeneralSettings.tsx` / `ServerSettingsCategory.tsx` splits must respect the 250-line budget; `MelodiqSettingsCategory.tsx` disappears.
- Budget/duplication gates: moving controls first (slice 2) avoids clones during later slices.

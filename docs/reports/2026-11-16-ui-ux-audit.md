---
type: Report
title: 'UI/UX audit: header, back buttons, settings, confirmations, touch and i18n across all games'
description: 'Static audit of all 16 games and the app shell by five read-only scouts plus a visual pilot of Melodiq Notes; findings grouped by pattern with a proposed PR sequence.'
tags: [ux, ui, audit, header, settings, a11y, i18n, melodiq-notes]
status: draft
generated:
  at: 2026-11-16T12:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-16
  method: 'Five Haiku scouts read the .tsx files of src/games/*, src/components, src/modules and src/features (no tests); the orchestrator spot-checked five findings with grep and screenshotted Melodiq Notes at 390x844 and 1280x800 (dark, de) with Playwright. Lines marked Unverified were not confirmed at runtime.'
sources:
  - 'DESIGN.md'
  - 'src/components/Layout/GlobalHeader.tsx'
  - 'src/components/settings/GameSettingsSheet.tsx'
  - 'src/components/common/GameHeaderBar.tsx'
  - 'src/games/melodiq-notes/settings/InstrumentSettings.tsx'
---

# UI/UX audit, 2026-11-16

Snapshot; line numbers are from this date. Reference rules: `DESIGN.md` lines 116–121 (spacing, content width, 48px touch target, `100dvh`), 152 (ConfirmDialog for destructive actions), 158 (one top bar, title via `usePageTitle`, no own back button), 159 (dialogs).

Intended patterns that already exist:

- Back, exit and actions: `useHeaderLayout()` (`setHomeAction`, `setMenuItems`, `setCustomHeaderActions`) in `src/context/HeaderLayoutContext.tsx`. Good examples: `src/games/darts/DartsGame.tsx:22-36`, `src/games/qwixx/hooks/useQwixxHeaderActions.tsx`, `src/games/melodiq/hooks/useMelodiqHeader.tsx`.
- Game settings: header gear → `GameSettingsSheet` with sections from `src/lib/gameSettingsRegistry.tsx`; shared controls `SettingSlider` / `SettingSwitch` in `src/components/settings`. Only Wordle, Melodiq and Melodiq Notes use it.
- Destructive actions: `src/components/common/ConfirmDialog.tsx`.
- Bottom sheets: `src/games/melodiq-notes/components/NotesSheet.tsx` (dvh plus safe-area padding).

## P1 — Second top bars and own back buttons (DESIGN.md:158)

| Where                                                                                                                                                                 | What                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/common/GameHeaderBar.tsx:11-23`                                                                                                                       | Shared second `AppBar`; used by GuessArt and Storyteller while they hide `GlobalHeader` (`GuessArtGame.tsx:124`, `StorytellerGame.tsx:50`), so gear, feedback and title vanish during play |
| `src/games/guessart/components/GuessArtHeader.tsx:46-73`                                                                                                              | Own bar with ArrowBack                                                                                                                                                                     |
| `src/games/storyteller/components/StoryHeader.tsx:59-65`                                                                                                              | Own bar with exit ArrowBack                                                                                                                                                                |
| `src/games/garticphone/components/GarticHeader.tsx:66-171`                                                                                                            | Second bar below the global header: back arrow, hardcoded title, share, "end game"; `GarticPhoneGame.tsx` never calls `usePageTitle`                                                       |
| `src/games/garticphone/components/AlbumRevealControls.tsx:42-46`                                                                                                      | Third exit ("Menü") on the same screen                                                                                                                                                     |
| `src/games/cards/components/common/CardGameHeader.tsx:30-74`                                                                                                          | In-body "Zurück" plus undo/history/restart icon row                                                                                                                                        |
| `src/games/guessart/components/GuessArtRoomGame.tsx:38-40`, `src/games/knister/KnisterRoomGame.tsx:78-80`, `src/games/storyteller/components/StoryRoomGame.tsx:35-52` | In-body "back to lobby/party" button in room mode                                                                                                                                          |
| `src/games/imposter/components/ImposterResultView.tsx:55-56`                                                                                                          | "Zurück" with a home icon, navigates to `/`                                                                                                                                                |
| `src/components/connection/DeviceConnection.tsx:62-70`                                                                                                                | Own "Back" pill plus repeated title (Melodiq connection page)                                                                                                                              |
| `src/games/melodiq/components/MelodiqPlaylists.tsx:68-71`, `PlaylistDetails.tsx:57-60`                                                                                | Body back arrows next to the header back, with a different target in `PlaylistDetails`                                                                                                     |
| `src/games/melodiq/gameplay/components/SessionFolderPrompt.tsx:20-28`                                                                                                 | Full-screen black `100vh` gate, English "Go Back"                                                                                                                                          |
| `src/games/werewolf/components/RoleEditor.tsx:196`                                                                                                                    | Full-screen editor whose only exit is a footer "Back" button                                                                                                                               |
| `src/games/tabletop/components/views/TableGameMenu.tsx:49-70`                                                                                                         | "Back to lobby" hidden in a floating canvas menu                                                                                                                                           |
| `src/games/sudoku/components/SudokuHeader.tsx:33,52,76-79`                                                                                                            | Dead `onBack` prop that would render a body arrow                                                                                                                                          |

Back-to-lobby currently has four forms: header arrow (Melodiq), header menu item (Melodiq Notes, `useMelodiqNotesHeader.tsx:117-120`), in-body button (GuessArt, Knister, Storyteller), canvas menu (Tabletop).

Legitimate, keep: `guessart/components/WordSelector.tsx:127`, `werewolf/.../PyromaniacView.tsx:56` (wizard steps), `garticphone/components/AlbumRevealControls.tsx:66` (pager), `tabletop/TabletopGame.tsx:150` (error recovery), `App.tsx:55-75` (Android hardware back).

## P2 — Game actions in a body row instead of the header

`sudoku/components/SudokuHeader.tsx` (stats, help), `wordle/components/HeaderActionBar.tsx:20-50` (history, duel, stats, help; `WordleGame.tsx` also repeats stats as a body button), `cards/components/common/CardGameHeader.tsx:43-74`, `imposter/ImposterGame.tsx:116-134` (floating info button over the phase content), Tabletop (three floating clusters: `TableGameMenu`, `EditorToolbar.tsx:31`, `TabletopToolbar.tsx:51`; a canvas game may justify part of this — decision needed).

## P3 — Settings

Melodiq Notes (visual pilot, confirmed in screenshots):

- `settings/InstrumentSettings.tsx:87-129`: the row switches to horizontal at the viewport `sm` breakpoint, but lives in a 420px drawer; the minimum widths (160 + 200 + 140 + icon) do not fit. Desktop: URL field cut off, volume slider and preview button outside the drawer. Phone: each instrument is a tall, mostly empty stacked card with a truncated placeholder. Fix: lay out by container width (two lines: name + preview, then URL + volume) and use `SettingSlider`.
- Outlined cards nested in an outlined card; heading "Sounds" directly above the caption "Sound-Einstellungen"; two heading styles (`InstrumentSettings.tsx:57` vs `components/SoundSettingsSection.tsx:42`).
- `InstrumentSettings.tsx:61-71`: "reset to FOSS default" wipes the sound config without confirmation; the label wraps on phones.
- `InstrumentSettings.tsx:98,104,111`: "GM #", the placeholder and "Vol:" are hardcoded.
- Audio latency is a separate dialog from the play bar (`stage/components/InputMenu.tsx:63` → `LatencyDialog`), not reachable from the settings sheet.

Across games:

- Four settings containers: `GameSettingsSheet`, the `/settings` route page, `RemoteHostSettingsModal.tsx:47` (Melodiq host settings, header menu), `ServerSetupDialog.tsx:19`; plus the in-page `DeviceConnection`.
- Games with settings outside the gear: Tabletop (canvas gear → `TableSettingsDialog`), Werewolf (setup "Editor" button → full-screen dialog), Darts (header menu → dialog, in the overflow on phones), Imposter and GuessArt (inline in setup; fine for pre-game options).
- `src/features/settings/SettingsPageLayout.tsx:22`: `maxWidth 'lg'`, DESIGN.md:119 says 720px for text pages.

## P4 — Destructive actions without confirmation

| Where                                                 | What                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `sudoku/components/SudokuHeader.tsx` difficulty group | Changing difficulty mid-game discards progress                             |
| `cards/components/common/CardGameHeader.tsx:66-74`    | Restart wipes all rounds                                                   |
| `darts/components/DartsGameSetupDialog.tsx:46-50`     | Saving with a changed mode resets the running game (`useDartsGame.ts:273`) |
| `storyteller/components/SavedStoriesCard.tsx:72-79`   | Delete saved story at once                                                 |
| `melodiq-notes/settings/InstrumentSettings.tsx:61-71` | Sound reset                                                                |
| `drawpot/DrawPotAdmin.tsx:49-50`                      | "Forget"                                                                   |

Raw `Dialog` instead of `ConfirmDialog`: `qwixx/QwixxGame.tsx:74-95` (confirm button reads "Neues Spiel", same as the title), `imposter/components/GameTimer.tsx:101-112`, `garticphone/components/GarticHeaderDialogs.tsx:100-118`.

## P5 — Icon buttons: labels and touch size (DESIGN.md:120)

No `aria-label` or Tooltip: `melodiq-notes/components/NotesDialogFrame.tsx:54` (close button of six dialogs), `components/feedback/FeedbackDialog.tsx:72`, `components/connection/ServerConnection.tsx:93`, `modules/audio/AudioInputSettings.tsx:192`, `knister/components/KnisterNumberPickerModal.tsx:84`, `qwixx/components/QwixxRulesDialog.tsx:65`, `storyteller/components/StoryHeader.tsx:127`, `StoryReaderModal.tsx:88`, `melodiq/components/SessionRosterRow.tsx:80-191`, `HostQueueDrawer.tsx:100`, `MelodiqSearchBar.tsx:90`, `tabletop/components/widgets/TimerWidgetView.tsx:66`, `controller/ControllerActionToolbar.tsx:81`, `werewolf/components/RoleEditor.tsx:147`, `darts/components/DartsGameSetupDialog.tsx:122`, `cards/components/ModernScoreAdjuster.tsx:119,149`.

`size="small"` icon buttons (30–34px) are used throughout; the Melodiq Notes settings sheet alone has nine controls under 40px (measured). A theme-level minimum hit area on touch devices would fix most at once.

## P6 — Hardcoded strings and wording

- English literals: Melodiq (about 20: `TVModeButton.tsx`, `UserProfilesManager.tsx`, `YouTubeSearchDialog.tsx`, `MelodiqConnection.tsx:37,58`, `SessionFolderPrompt.tsx`, scoreboard), Darts (`DartsInput.tsx:70-134`), aria-labels in `GuessArtHeader.tsx:138`, `GuessArtHeaderMenu.tsx:60`, `ServerSetupDialog.tsx:26`, `PWAInstallBanner.tsx:105`, `tabletop/.../PlayingCardFace.tsx:57`.
- German literals: `features/party/components/PartyGameSelection.tsx:61,64`, `garticphone/components/GarticPromptStep.tsx:15-22` (prompt ideas shown in every language).
- Close wording differs: "Schließen", "Verstanden", "Zurück", "Abbrechen", "Close"; Werewolf uses `common.back` for skipping an ability (`CustomRoleNight.tsx:143`, `WitchView.tsx:60`); Knister tooltip "Punkteübersicht" vs button "Regeln" (`KnisterToolbar.tsx:71-81`); Kniffel dice toggle has the same label in both states.

## P7 — Layout and safe areas

- `vh` / `100vw`: `App.tsx:26`, `melodiq/MelodiqGame.tsx:132`, `SessionFolderPrompt.tsx:20`, `HostQueueDrawer.tsx:55`, `darts/DartsGame.tsx:51`.
- No bottom safe-area inset: `melodiq/components/MiniPlayer.tsx:63-74`, `HostQueueDrawer.tsx:55`, `werewolf/WerewolfGame.tsx:42`. **Unverified:** Wordle keyboard.
- Nested scroll containers: `darts/DartsGame.tsx:42,51`, `garticphone/GarticPhoneGame.tsx:87` with `GarticAlbumReveal.tsx:49`.
- Fixed widths, **Unverified** at 360px: `melodiq/gameplay/components/SessionScoreOverlay.tsx:20` (400px), `DeviceQRCodeCard.tsx:31` (250px), `tabletop/.../TabletopControllerView.tsx:145`.
- `garticphone/components/GarticHeader.tsx:149`: phase chip hidden on phones.
- Colours: hex and non-black rgba in Tabletop widget views (`HolderWidgetView.tsx`, `TokenWidgetView.tsx`, `StandardSuitCardFace.tsx`, `HandCardItem.tsx`, `DeckWidgetView.tsx`), `melodiq/gameplay/LyricsLineView.tsx:63`, `darts/components/DartsScoreboard.tsx:97`.

## Proposed sequence (one issue and PR per step)

1. Melodiq Notes settings sheet (P3 pilot): container-based instrument rows, shared controls, confirm on reset, i18n, latency entry.
2. Remove `GameHeaderBar`: GuessArt, Storyteller and Gartic Phone move title, exit and actions to `GlobalHeader`; one back-to-lobby pattern for room mode (needs decision 1).
3. Remaining own back buttons (Cards, Imposter, DeviceConnection, Melodiq playlists, Werewolf role editor, Sudoku dead prop).
4. Confirmations (P4) with `ConfirmDialog`.
5. Body action rows to header actions (Sudoku, Wordle, Cards, Imposter).
6. Icon-button labels plus a theme-level touch minimum (P5).
7. i18n literals and close wording (P6).
8. `dvh`, safe areas, nested scroll (P7).
9. Ratchets in `check:architecture`: `GameHeaderBar` / `setHeaderHidden` use outside immersive mode, ArrowBack icons in `src/games`, `IconButton` without `aria-label`.

## Maintainer decisions needed

1. Back to lobby in room mode: header back arrow (as Melodiq) or header menu item (as Melodiq Notes)?
2. May a running game hide `GlobalHeader` at all (today GuessArt, Storyteller; Melodiq Notes only when immersive)?
3. Tabletop: keep floating canvas controls, or move menu and settings to the header?
4. Close label: one word for all info dialogs ("Schließen")?

## Not covered

Only Melodiq Notes was checked visually. Multi-device states (host plus players) and the other 15 games were audited from code only; a screenshot pass per game should precede steps 5 and 8.

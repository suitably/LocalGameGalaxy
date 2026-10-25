# DESIGN.md — Nexumia visual system

Status: **partly implemented.** Dark tokens, fonts, logo and app icons are live (`src/themeTokens.ts`, `src/theme.ts`); light mode and the games' hard-coded colours are not yet (§10). This file is the target every new or changed screen follows; the migration steps are in §10. Covers the whole product: hub, game screens, phone controllers, TV mode and the Android app.

## 1. Direction: "Game night on the couch"

Nexumia is a box of party games for a living room: several people, one TV or laptop, phones as controllers. The look borrows from physical game components, not from SaaS dashboards.

| Principle                    | What it means on screen                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Readable from the couch**  | High contrast, big numbers, one clear action per screen. TV mode is a 10-foot UI (§3.3).                                                        |
| **Tactile, like game parts** | Solid colour fills, generous rounding, a hard "edge" under pressable things (§5). No glass, no blur, no glow.                                   |
| **Warm, not neon**           | Warm ink and paper neutrals instead of grey-blue; one bright sun-yellow for actions.                                                            |
| **Colour means a player**    | The eight piece colours (§2.3) belong to players and game pieces. UI chrome stays neutral so a player's colour is never confused with a button. |

Avoid: purple-to-blue gradients, gradient text, glassmorphism, neon glows, emoji as icons, three identical feature cards, every section centred.

## 2. Color

All colours are tokens; components use the token name, never a hex value (`check:architecture` fails when a `.tsx` file gains hard-coded colours; see `docs/tech/coding-conventions.md`). Text contrast ≥ 4.5:1 and large text / UI parts ≥ 3:1 were checked for every pairing listed here.

### 2.1 Neutrals and roles

| Token            | Dark      | Light     | Role                                                   |
| ---------------- | --------- | --------- | ------------------------------------------------------ |
| `bg.canvas`      | `#17141C` | `#FAF6F0` | Page background, `theme-color`, PWA splash             |
| `bg.surface`     | `#211D27` | `#FFFFFF` | Cards, sheets, dialogs, header                         |
| `bg.raised`      | `#2C2733` | `#F1EBE2` | Hover fill, tonal buttons, inputs, nested surfaces     |
| `border.subtle`  | `#403A49` | `#DDD3C5` | Dividers, card outlines (decorative, not for controls) |
| `border.strong`  | `#6B6375` | `#8C8291` | Input outlines, outlines of piece colours on light bg  |
| `text.primary`   | `#F7F3EE` | `#1D1A21` | Body and headings (≥ 13:1 on all surfaces)             |
| `text.secondary` | `#B9B1BD` | `#5F5866` | Supporting text, captions (≥ 5.7:1 on all surfaces)    |
| `text.disabled`  | `#7D7585` | `#9A919F` | Disabled labels only — never for information           |

### 2.2 Brand and status

| Token          | Dark      | Light     | On-colour text        | Role                                                             |
| -------------- | --------- | --------- | --------------------- | ---------------------------------------------------------------- |
| `primary`      | `#FFC233` | `#FFC233` | `#17141C`             | **Sun.** Primary buttons, active tab, selected toggle, progress  |
| `primary.edge` | `#C78F00` | `#C78F00` | —                     | Hard bottom edge of primary buttons (§5)                         |
| `primary.text` | `#FFC233` | `#8A5B00` | —                     | Links and primary-coloured text (yellow is unreadable on paper)  |
| `accent`       | `#3DD6C4` | `#0A6F65` | `#17141C` / `#FFFFFF` | **Lagoon.** Focus ring, "you" marker, current turn. Only accent. |
| `success`      | `#5BD98A` | `#1A7A43` | `#17141C` / `#FFFFFF` | Correct answer, saved, connected                                 |
| `warning`      | `#FF9F45` | `#A85400` | `#17141C` / `#FFFFFF` | Timer running out, weak connection                               |
| `error`        | `#FF6B6B` | `#C2302E` | `#17141C` / `#FFFFFF` | Errors, destructive actions, wrong answer                        |

Info messages use `bg.raised` with `text.primary`; there is no separate info colour.

### 2.3 Piece palette (players, dice, game elements)

Eight fixed colours for player seats, dice, score rows (e.g. Qwixx red/yellow/green/blue), teams and game tiles in the hub. Same value in both modes; text on them is always `#17141C`.

| Token          | Value     | Ink contrast |
| -------------- | --------- | ------------ |
| `piece.red`    | `#EF4E4E` | 5.1:1        |
| `piece.orange` | `#FF8A3D` | 7.8:1        |
| `piece.yellow` | `#F7D038` | 12.2:1       |
| `piece.green`  | `#3FBF6B` | 7.7:1        |
| `piece.teal`   | `#2BB5A8` | 7.2:1        |
| `piece.blue`   | `#3D8BFF` | 5.5:1        |
| `piece.purple` | `#9B6BFF` | 5.2:1        |
| `piece.pink`   | `#F35FA8` | 6.1:1        |

Rules:

- Seat order is the table order above (seat 1 = red …). Games pick from this palette; they do not define their own colours.
- On light surfaces a piece fill gets a 1px `border.strong` outline (yellow, orange, green and teal are under 3:1 against paper).
- Colour is never the only signal: pair it with the player's name, initial, number or a shape (colour-blind players, glare on a TV).
- Tints for large areas (a player's score column, a row background): the piece colour at 16 % opacity over `bg.surface`, text stays `text.primary`.
- Game-specific needs that the palette cannot cover (e.g. Sudoku conflict highlights, Wordle letter states) map to roles first (`success`, `warning`, `error`, `accent`). Anything still missing is added here as a token, never inline.
- In code: `theme.palette.piece.*` in components, `piecePalette`, `PIECE_ORDER`, `pieceColorForSlot()` and `pieceNeutrals` (white/black pieces) from `src/themeTokens.ts` in logic and canvas code.
- **Exempt — table content:** what a game _depicts_ keeps realistic or user-defined colours: playing-card faces and suits, wood holders, table felt, imported Tabletop widget colours (`src/games/tabletop/logic/*` parsers), MusicXML colours, the karaoke lyric highlight on video. Exempt colours never style UI chrome (buttons, dialogs, navigation, selection).

## 3. Typography

### 3.1 Families

| Role    | Family                             | Package (self-hosted, works offline)       | Use                                              |
| ------- | ---------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| Display | **Bricolage Grotesque** (variable) | `@fontsource-variable/bricolage-grotesque` | Headings `display`–`h3`, big scores, game titles |
| Text/UI | **Figtree** (variable)             | `@fontsource-variable/figtree`             | Everything else: body, buttons, inputs, labels   |

Fallback stack: `"Figtree Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Fonts are bundled by Vite and precached by the service worker; no font CDN.

Numbers that change (scores, timers, dice totals) use `font-variant-numeric: tabular-nums` so they don't jump (both families ship `tnum`).

### 3.2 Scale

Base 16px (`1rem`). Body text never below 16px; `caption` only for labels and metadata.

| Token     | Size / line height                  | Weight                | Family  | MUI variant                                           |
| --------- | ----------------------------------- | --------------------- | ------- | ----------------------------------------------------- |
| `display` | 3.5rem / 1.05                       | 800                   | Display | `display`; `scoreText` (`themeTokens.ts`) for numbers |
| `h1`      | 2.5rem / 1.1                        | 750                   | Display | `h1`                                                  |
| `h2`      | 2rem / 1.15                         | 700                   | Display | `h2`                                                  |
| `h3`      | 1.75rem / 1.2 (`h4`: 1.5rem / 1.25) | 700                   | Display | `h3`, `h4`                                            |
| `title`   | 1.25rem / 1.3 (`h6`: 1.1rem)        | 650                   | Text    | `h5`, `h6`, dialog titles, card titles                |
| `body`    | 1rem / 1.5                          | 400 (strong: 600)     | Text    | `body1`, `subtitle1` (600)                            |
| `small`   | 0.875rem / 1.45                     | 400 / 600             | Text    | `body2`, `subtitle2`, `button` (600)                  |
| `caption` | 0.75rem / 1.35                      | 600, +0.02em tracking | Text    | `caption`, `overline` (no uppercase)                  |

Buttons use sentence case (no `textTransform`). Long text (rules, help) is capped at 68ch.

### 3.3 Device contexts

| Context                      | Rule                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Phone controller (360–430px) | `responsiveFontSizes` shrinks `display`–`h2`; body stays 16px.                                 |
| Host PC / laptop             | Scale as above.                                                                                |
| TV mode (1080p+, 3 m away)   | Scale × 1.5 (body 24px, `display` 5.25rem); nothing smaller than 20px; max 3 actions per view. |

Implementation: `createTvTheme()` in `src/themeTv.ts` (explicit ×1.5 sizes, min 20px, 32px icons, 48px container gutter, always dark), applied by `src/components/common/TvThemeProvider.tsx` around TV views.

## 4. Spacing and layout

- **Scale (MUI `theme.spacing`, 8px base):** `0.5`=4 · `1`=8 · `1.5`=12 · `2`=16 · `3`=24 · `4`=32 · `6`=48 · `8`=64. No other values.
- **Page gutter:** 16px phone, 24px tablet/desktop, 48px TV.
- **Section gap:** 32px phone, 48px desktop. **Gap inside cards:** 16px; between cards in a grid: 16px (phone) / 24px.
- **Content width:** hub and lobbies max 1200px; text pages (rules, settings) max 720px; game boards use the full viewport.
- **Touch targets:** ≥ 48×48px everywhere; ≥ 56px for primary actions on phone controllers (people tap without looking).
- Layout via Grid/Flexbox, full-height screens use `100dvh`, safe areas per [docs/tech/styling.md](docs/tech/styling.md) §4.

## 5. Shape and depth

| Token         | Value  | Use                                      |
| ------------- | ------ | ---------------------------------------- |
| `radius.sm`   | 8px    | Inputs, chips, small tiles, score cells  |
| `radius.md`   | 12px   | Buttons, toggles, menus                  |
| `radius.lg`   | 20px   | Cards, dialogs, sheets, game tiles       |
| `radius.full` | 9999px | Avatars, player badges, pills, dice pips |

`theme.shape.borderRadius` = 4, so `sx={{ borderRadius: 2 }}` = 8px (`sm`), `3` = 12px (`md`), `5` = 20px (`lg`). Use only these steps.

**Depth.** Surfaces are separated by colour (`canvas` → `surface` → `raised`), not by shadow. Two effects only:

| Token            | Value                                                                      | Use                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `edge`           | `0 4px 0 <edge colour>` (primary: `primary.edge`; others: `border.subtle`) | Pressable game parts: primary buttons, dice, answer buttons on controllers. On press: `translateY(2px)` and edge 2px. |
| `shadow.overlay` | dark `0 12px 32px rgba(0,0,0,.5)` / light `0 12px 32px rgba(29,26,33,.16)` | Dialogs, menus, snackbars only.                                                                                       |

MUI `elevation` stays 0 everywhere else.

## 6. Components

All interactive parts show **focus-visible** as a 3px `accent` ring with 2px offset. **Disabled**: `bg.raised` fill, `text.disabled` label, no edge — never opacity alone.

| Component                      | Spec                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary button                 | `primary` fill, ink text, `radius.md`, 600 weight, `edge`. Hover: 8 % lighter. One per view.                                                                                                                                                                                                                                                                                                       |
| Secondary button               | `bg.raised` fill, `text.primary`, 1px `border.subtle`. Hover: `border.strong`.                                                                                                                                                                                                                                                                                                                     |
| Quiet button                   | No fill, `text.primary` (or `primary.text` for links-as-buttons). Hover: `bg.raised`.                                                                                                                                                                                                                                                                                                              |
| Destructive                    | Secondary style with `error` text; confirmation via `ConfirmDialog` with an `error`-filled confirm button.                                                                                                                                                                                                                                                                                         |
| Link                           | `primary.text`, underline on hover and in body copy.                                                                                                                                                                                                                                                                                                                                               |
| Input / select                 | `bg.raised` fill, 1px `border.strong`, `radius.sm`, 48px high, label above (not floating-only). Error: `error` border + message below.                                                                                                                                                                                                                                                             |
| Card                           | `bg.surface`, 1px `border.subtle`, `radius.lg`, 16–24px padding, no shadow.                                                                                                                                                                                                                                                                                                                        |
| Game tile (hub)                | Card with a solid square icon plate in the game's piece colour (`radius.md`), title in `title`, one line of description. No gradients.                                                                                                                                                                                                                                                             |
| Player badge                   | `radius.full` chip in the seat's piece colour, ink initial/name. "You" adds a 2px `accent` ring.                                                                                                                                                                                                                                                                                                   |
| Header / nav                   | `GlobalHeader` only (`usePageTitle`, `useHeaderLayout`): `bg.surface`, 1px bottom `border.subtle`, 56px + safe area. No second top bar, no floating exit buttons. **The page title lives only here** (`usePageTitle`): content starts with section headings, never repeats the screen or game name, and has no own back-to-hub button. Exceptions: the hub (logo lock-up) and TV mode (no header). |
| Dialog                         | `bg.surface`, `radius.lg`, `shadow.overlay`, actions bottom-right (stacked full-width on phone), primary action last.                                                                                                                                                                                                                                                                              |
| Snackbar / toast               | `bg.raised` (dark) / `#1D1A21` (light inverse), `radius.md`, `shadow.overlay`, status icon in status colour.                                                                                                                                                                                                                                                                                       |
| Timer / score                  | Display family, `tabular-nums`; turns `warning` in the last 10 s, `error` at 0.                                                                                                                                                                                                                                                                                                                    |
| Empty / loading / error states | Every list and lobby has all three: short sentence + one action. Skeletons use `bg.raised`, no shimmer gradient.                                                                                                                                                                                                                                                                                   |

**Motion:** 150 ms for hover/press, 250 ms for enter/exit, `cubic-bezier(.2,.8,.2,1)`. Celebrations (winner, correct answer) may bounce once; everything respects `prefers-reduced-motion`.

## 7. Imagery and icons

- **Icons:** `@mui/icons-material`, **Rounded** variant only (matches the rounded shapes), 24px (20px in dense rows, 32px in TV mode). Icon colour follows the text colour of its context.
- **No emoji as UI icons.** Emoji in user content (names, chat) is fine.
- **Werewolf roles:** built-in role and winner icons come from `src/games/werewolf/components/RoleIcon.tsx` (Rounded MUI icons keyed by role id). Free text in a custom role's icon field is user content and is shown as typed.
- **Illustrations:** flat shapes from the piece palette with the ink colour as outline, no gradients or 3D renders. Only for empty states, onboarding and game covers.
- **Photos:** none in the UI. Album art (Melodiq) is shown in `radius.sm` frames.

## 8. Logo and brand architecture

One umbrella brand, **Nexumia**, whose mark is a **couch** ("games on the couch"). Areas of the platform are not separate brands: they reuse the couch in their own colour and carry a name label. Sources live in [`design/brand/`](design/brand/) (overview: `design/brand/uebersicht.png`).

### 8.1 Master mark

| File (`design/brand/`)   | Use                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `nexumia-mark.svg`       | Couch in `primary` with `primary.edge` underneath; 48px and up (header, splash, store). |
| `nexumia-mark-small.svg` | Simplified: thicker cuts, no seam, no edge; 32px and below.                             |
| `nexumia-mark-mono.svg`  | Ink on paper; print, light surfaces, one-colour use.                                    |
| `nexumia-app-icon.svg`   | Large mark on an ink tile (PWA, Android launcher).                                      |
| `nexumia-favicon.svg`    | Small mark on an ink tile; copied to `public/nexumia-icon.svg`.                         |

The cuts between the couch parts are drawn in ink, so the colour marks sit on dark surfaces (`bg.canvas`/`bg.surface` dark); on light surfaces use the mono mark. Clear space around the mark: ¼ of its width. Never recolour the master mark, add effects or put it on piece colours.

**Word mark:** "Nexumia" in Bricolage Grotesque 800, tracking −0.02em, set to the right of the mark at about 55 % of the mark's height. Outlined as paths (no font needed): `nexumia-wordmark.svg` (light, on dark) and `nexumia-wordmark-ink.svg`; lock-ups `nexumia-lockup.svg` / `nexumia-lockup-ink.svg` (also `src/assets/nexumia-banner.svg`, used by the hub).

### 8.2 Areas

Each area is the couch in its piece colour with the area symbol on the (taller) backrest: `design/brand/area-<id>.svg`. Area symbols are drawn on the same 64 grid and also appear alone in labels.

| Area   | File              | Colour         | Symbol           | `GameCategory` values                  |
| ------ | ----------------- | -------------- | ---------------- | -------------------------------------- |
| Musik  | `area-music.svg`  | `piece.blue`   | Note             | `music`                                |
| Würfel | `area-dice.svg`   | `piece.red`    | Die (three pips) | `dice`                                 |
| Karten | `area-cards.svg`  | `piece.green`  | Two fanned cards | `cards`                                |
| Party  | `area-party.svg`  | `piece.pink`   | Speech bubble    | `party`, `drawing`, `social_deduction` |
| Rätsel | `area-puzzle.svg` | `piece.purple` | 2×2 tiles        | `puzzle`                               |

The mapping lives in `src/lib/areas.ts`; the hub filters by area.

- **Area lock-up** (hub section headers, area pages): area couch + small "Nexumia" caption above the area name in the display face.
- **Area label** (filters, chips, game cards): pill in the piece colour, ink symbol (20px) + ink area name, 600–700 weight. Labels are UI, not logos: no couch inside.
- Area icons are used at 48px and above; below that use the label.
- Piece colours used for areas are still player colours in games (§2.3). Inside a game, colour means player; in the hub, colour means area.

### 8.3 App icons

Generated from `design/brand/nexumia-mark.svg`: `public/pwa/*.png` (any: mark on rounded ink tile; maskable: mark at 62 % on full-bleed ink), Android `mipmap-*/ic_launcher*.png` (foreground mark inside the 72dp safe zone, background `ic_launcher_background` = `#17141C`) and `drawable*/splash.png` (mark centred on ink).

## 9. Light and dark mode

Both modes are first-class. Default follows the system (`prefers-color-scheme`); a user setting (system / dark / light) overrides it. TV mode defaults to dark. Every token in §2 has both values; anything added must define both.

## 10. Implementation and migration

Order (each step its own PR):

1. ~~**Tokens in code**~~ — done for dark (`src/themeTokens.ts` holds dark, light and piece tokens; `src/theme.ts` builds a dark-only MUI theme, no `colorSchemes`/CSS variables yet, because MUI would follow the system mode and keep its own `localStorage` key). Original plan: rewrite `src/theme.ts` with MUI `colorSchemes` (`dark` + `light`) and CSS variables (`cssVariables: true`), the piece palette as a custom palette key, typography (§3), `shape.borderRadius: 4`, component overrides (§6). Update `index.css`, `index.html` and the PWA manifest in `vite.config.ts` to `bg.canvas`.
2. ~~**Fonts**~~ — done: add both `@fontsource-variable` packages, import in `src/main.tsx`.
3. **Mode setting:** storage key via `src/lib/storage.ts`, toggle in settings; then enable `colorSchemes` with `lightTokens`. Needs step 5 first for game screens, or light mode limited to hub/settings.
4. ~~**Hub**~~ — done: tiles and filter use the areas (`src/lib/areas.ts`, `src/features/hub/HubGameCard.tsx`, `HubAreaFilter.tsx`). The unused gradient fields in `src/lib/gameRegistry.tsx` go with suitably/LocalGameGalaxy#498.
5. **Games:** done for every file that stays within its component budget (codemod for `sx` props, hand edits elsewhere, stage canvas via `STAGE` in `src/games/melodiq-notes/stage/render/common.ts`). The 35 files that must be decomposed first are tracked in suitably/LocalGameGalaxy#491–#498; light mode in #499; epic #490.
6. ~~Logo, word mark and app icons~~ — done (§8). Remaining: area icons in the hub (with step 4).

Until a screen is migrated it may keep its old colours, but changed lines must use tokens.

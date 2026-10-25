---
type: Styling Guide
title: Styling, Theme & Multi-Device Layout Architecture
description: MUI theming conventions, palette tokens, Capacitor safe area insets, and responsive layout guidelines.
resource: src/theme.ts
tags: [styling, mui, theme, css, mobile, capacitor]
status: stable
generated:
  at: 2026-09-27T10:00:00Z
  by: previous-agent
verified:
  at: 2026-10-25
  method: '2026-10-23: §1 and §6 checked against src/theme.ts, src/index.css, index.html and package.json'
---

# Styling, Theme & Multi-Device Layout Architecture

---

## 1. UI Framework & Theming

LocalGameGalaxy uses **Material UI (MUI) v7** for all UI components and theming.

- The global theme is defined in `src/theme.ts`.
- Dark and light mode: `src/theme.ts` builds `appTheme` with MUI `colorSchemes` (`dark` + `light`, no CSS variables) from `darkTokens` / `lightTokens` in `src/themeTokens.ts`; the `piece` palette is `theme.palette.piece`. `ColorModeProvider` (`src/context/ColorModeProvider.tsx`) picks the scheme from the user setting `STORAGE_KEYS.COLOR_MODE` (`system` default / `dark` / `light`, `src/lib/colorMode.ts`, Settings → General → Appearance); MUI's own `mui-mode` storage is disabled (`storageManager={null}`). TV views use `TvThemeProvider` (dark-only `baseTheme`) and stay dark. See [DESIGN.md](../../DESIGN.md) §9.
- Primary-coloured text, icons and thin parts use `primary.text` (`theme.palette.primary.text`, sx `'primary.text'`); `primary.main` (sun-yellow) is the fill colour and is unreadable on paper. Theme overrides already map `Typography`/`SvgIcon` `color="primary"`, text/outlined buttons, links, outlined chips and selected toggle buttons/tabs.
- The visual system (colors, type, spacing, radius, components) is defined in [DESIGN.md](../../DESIGN.md). Dark tokens, fonts and logo are implemented; the remaining migration order is in DESIGN.md §10.
- Theme tokens (colors, typography, spacing) are accessed via `theme.palette.*` — **never hardcode hex color values**.

---

## 2. Styling Conventions

| Approach                                   | When to Use                                                          |
| ------------------------------------------ | -------------------------------------------------------------------- |
| **`sx` prop**                              | Small, one-off layout adjustments (padding, flex alignment, margins) |
| **`styled()` from `@mui/material/styles`** | Complex, reusable styled components requiring clean DOM              |
| **CSS Variables**                          | Safe area insets, dynamic values from Capacitor plugins              |
| **Global CSS** (rare)                      | Root-level resets only (`index.css`)                                 |

**Do not** use Tailwind CSS, plain CSS files per component, or hardcoded inline style objects for layout.

---

## 3. Multi-Device Layout

The app renders across three distinct device contexts:

| Device             | Screen                               | Layout Strategy                    |
| ------------------ | ------------------------------------ | ---------------------------------- |
| **Host PC/Laptop** | Desktop browser, wide viewport       | Standard MUI responsive grid       |
| **Phone Client**   | Smartphone portrait (360–430px wide) | Mobile-first, full-height `100dvh` |
| **TV Mode**        | Large display (1080p+), landscape    | Full-bleed canvas overlays         |

Use `useMediaQuery(theme.breakpoints.down('sm'))` to conditionally render mobile vs desktop layouts.

---

## 4. Capacitor Edge-to-Edge & Safe Areas

On Android API 35+, the WebView extends **under** the system status bar and navigation bar. Without safe area handling, content will be hidden behind system UI.

### Required CSS Pattern

Apply to root layout containers and any full-screen overlays:

```css
/* In MainLayout or root container */
padding-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
padding-bottom: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px));
```

CSS variables are provided by `capacitor-plugin-safe-area` and injected into the document root at runtime.

---

## 5. Mobile Web Native Feel

Apply these CSS rules globally in `index.css` or the root layout to prevent default mobile browser behaviors that feel unnatural in an app context:

```css
/* Prevent text selection on tap (except in inputs) */
* {
  user-select: none;
  -webkit-touch-callout: none;
}
input,
textarea {
  user-select: auto;
}

/* Disable gray flash on tap */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Prevent pull-to-refresh */
body {
  overscroll-behavior-y: contain;
}
```

Pinch-zoom stays enabled app-wide (WCAG, #512). Game surfaces with their own gestures set `touch-action: none` on their root (tabletop board, drawing canvases, Melodiq Notes stage/pult); tap-only controllers (dice, Qwixx, Knister, tabletop controller) use `touch-action: manipulation` to drop double-tap zoom.

```css
/* Use dynamic viewport height (avoids mobile browser bar issues) */
.full-height {
  height: 100dvh;
}
```

---

## 6. Typography

Fonts are self-hosted via `@fontsource-variable/figtree` (text, `theme.typography.fontFamily`) and `@fontsource-variable/bricolage-grotesque` (opsz axis; `h1`–`h4`), imported in `src/main.tsx` and precached by the service worker. Scale and rules: [DESIGN.md](../../DESIGN.md) §3.

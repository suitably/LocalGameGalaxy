# Styling, Theme & Multi-Device Layout Architecture [ID: TECH-STYLING]

---

## 1. UI Framework & Theming

LocalGameGalaxy uses **Material UI (MUI) v7** for all UI components and theming.

- The global theme is defined in `src/context/ThemeContext.tsx` (or equivalent).
- The app supports **dark mode** and **light mode**, toggled via the `lgg_theme` localStorage key.
- Theme tokens (colors, typography, spacing) are accessed via `theme.palette.*` — **never hardcode hex color values**.

---

## 2. Styling Conventions

| Approach | When to Use |
|----------|-------------|
| **`sx` prop** | Small, one-off layout adjustments (padding, flex alignment, margins) |
| **`styled()` from `@mui/material/styles`** | Complex, reusable styled components requiring clean DOM |
| **CSS Variables** | Safe area insets, dynamic values from Capacitor plugins |
| **Global CSS** (rare) | Root-level resets only (`index.css`) |

**Do not** use Tailwind CSS, plain CSS files per component, or hardcoded inline style objects for layout.

---

## 3. Multi-Device Layout

The app renders across three distinct device contexts:

| Device | Screen | Layout Strategy |
|--------|--------|-----------------|
| **Host PC/Laptop** | Desktop browser, wide viewport | Standard MUI responsive grid |
| **Phone Client** | Smartphone portrait (360–430px wide) | Mobile-first, full-height `100dvh` |
| **TV Mode** | Large display (1080p+), landscape | Full-bleed canvas overlays |

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
* { user-select: none; -webkit-touch-callout: none; }
input, textarea { user-select: auto; }

/* Disable gray flash on tap */
* { -webkit-tap-highlight-color: transparent; }

/* Prevent pull-to-refresh */
body { overscroll-behavior-y: contain; }

/* Use dynamic viewport height (avoids mobile browser bar issues) */
.full-height { height: 100dvh; }
```

---

## 6. Typography

Use the **Inter** font (loaded via Google Fonts or bundled) as the primary typeface. MUI's default Roboto font can be retained for smaller elements but Inter is preferred for headings and game UI text.

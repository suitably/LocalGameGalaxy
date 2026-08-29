# PWA & Smartphone UI Enhancement Implementation Plan [ID: PLAN-PWA-MOBILE-UI]

## 1. Goal Description
The user wants to install the entire LocalGameGalaxy application as a Progressive Web App (PWA) rather than being tied to a single mode, and have the browser address/search bar disappear when running as a PWA on smartphones. The user also wants the UI to be optimized for smartphone usage.

### Core Objectives
1. **Full-App PWA Capabilities**:
   - Provide a comprehensive Web App Manifest (`standalone` display mode, high-res icons, proper scope and start URL).
   - Ensure the browser address/search bar (URL bar / browser chrome) is completely hidden in standalone PWA mode.
   - Support iOS Home Screen / Standalone PWA mode via proper Apple meta tags.
   - Automatic Service Worker registration via `vite-plugin-pwa`.
2. **In-App PWA Installation Experience**:
   - Implement a reusable hook `usePWAInstall` to detect standalone status, capture `beforeinstallprompt`, and detect iOS Safari.
   - Add responsive PWA install actions in `GlobalHeader`, an install banner on `Hub`, and install status in `GeneralSettings`.
   - Provide an interactive iOS installation guide dialog explaining how to "Add to Home Screen" on Safari.
3. **Smartphone UI & Responsiveness Optimization**:
   - Use dynamic viewport units (`100dvh`) and safe-area insets (`env(safe-area-inset-*)`) in `MainLayout` and `index.css`.
   - Optimize header typography, spacing, and touch targets (min 48px) for mobile screens.
   - Refine `Hub` card typography, margins, and active touch scaling (`&:active`) for mobile devices.
   - Improve responsive layouts across views and modals for smartphone form factors.
4. **Complete Localization (i18n)**:
   - Provide comprehensive German (`de`) and English (`en`) translations for all new PWA and mobile UI strings.
5. **Quality Assurance**:
   - Ensure clean compilation with `npm run build` and `npm run lint` with 0 errors and 0 new warnings.

## 2. Component Hierarchy & File Breakdown
- `vite.config.ts`: Enhanced `VitePWA` configuration (manifest, absolute icon paths, standalone display mode, workbox caching, dev options).
- `index.html`: Apple mobile web app meta tags, touch icons, viewport settings.
- `src/vite-env.d.ts`: TypeScript definitions for Vite and `virtual:pwa-register`.
- `src/main.tsx`: Automatic service worker registration via `virtual:pwa-register`.
- `src/hooks/usePWAInstall.ts`: Custom hook for installation prompt capturing, standalone detection, and iOS support.
- `src/components/pwa/PWAInstallDialog.tsx`: Dialog for iOS installation instructions and prompt triggering.
- `src/components/pwa/PWAInstallBanner.tsx`: Mobile-friendly install callout banner for the Hub.
- `src/components/Layout/GlobalHeader.tsx`: Responsive header with install button/indicator and mobile burger menu.
- `src/components/Layout/MainLayout.tsx`: Viewport `100dvh` and safe area inset layout.
- `src/features/hub/Hub.tsx`: Mobile-optimized game cards, typography, and PWA install integration.
- `src/features/settings/components/GeneralSettings.tsx`: PWA status and install button in settings.
- `src/i18n/locales/en.json` & `src/i18n/locales/de.json` (or `src/i18n/index.ts` / `src/i18n.ts`): Translation keys for PWA features.
- `src/games/guessart/*`: Fix remaining TS errors to keep build/lint green.

## 3. Verification Plan
1. Run `npm run lint` -> Must pass with 0 errors.
2. Run `npm run build` -> Must compile with `tsc -b` and `vite build` without errors.
3. Verify PWA manifest and service worker output in `dist/`.
4. Test responsive layout, touch targets, and standalone mode media queries.

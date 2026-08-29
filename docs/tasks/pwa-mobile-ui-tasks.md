# PWA & Smartphone UI Enhancement Tasks [ID: TASKS-PWA-MOBILE-UI]

## Tasks

- [/] 1. PWA Configuration & Manifest Setup <!-- id: 1 -->
  - [x] 1.1 Update `vite.config.ts` with comprehensive VitePWA settings (standalone display mode, start_url, scope, full icon set, caching rules) <!-- id: 1.1 -->
  - [x] 1.2 Update `index.html` with Apple mobile web app meta tags, touch icons, theme colors, and responsive viewport configuration <!-- id: 1.2 -->
  - [x] 1.3 Add `src/vite-env.d.ts` and register service worker in `src/main.tsx` <!-- id: 1.3 -->
- [ ] 2. PWA Installation Hooks & Components <!-- id: 2 -->
  - [ ] 2.1 Implement `src/hooks/usePWAInstall.ts` to manage install prompts, standalone detection, and iOS Safari status <!-- id: 2.1 -->
  - [ ] 2.2 Create `src/components/pwa/PWAInstallDialog.tsx` for guided iOS/standalone installation info <!-- id: 2.2 -->
  - [ ] 2.3 Create `src/components/pwa/PWAInstallBanner.tsx` for responsive mobile install callouts <!-- id: 2.3 -->
  - [ ] 2.4 Add PWA install button to `src/components/Layout/GlobalHeader.tsx` and PWA status to `src/features/settings/components/GeneralSettings.tsx` <!-- id: 2.4 -->
- [ ] 3. Smartphone UI & Responsiveness Overhaul <!-- id: 3 -->
  - [ ] 3.1 Update `src/index.css` and `src/components/Layout/MainLayout.tsx` for `100dvh`, dynamic safe areas, and touch properties <!-- id: 3.1 -->
  - [ ] 3.2 Optimize `src/components/Layout/GlobalHeader.tsx` for compact mobile screens and safe areas <!-- id: 3.2 -->
  - [ ] 3.3 Redesign `src/features/hub/Hub.tsx` game cards, typography, touch interactions, and install banner for smartphones <!-- id: 3.3 -->
  - [ ] 3.4 Polish settings and dialog view layouts on small screens <!-- id: 3.4 -->
- [ ] 4. Localization (i18n) <!-- id: 4 -->
  - [ ] 4.1 Add German (`de`) and English (`en`) translations for all PWA installation texts, banners, and status messages <!-- id: 4.1 -->
- [ ] 5. Compilation, Lint & Verification <!-- id: 5 -->
  - [ ] 5.1 Fix remaining GuessArt TS errors to ensure clean compilation <!-- id: 5.1 -->
  - [ ] 5.2 Run `npm run lint` and `npm run build` to verify 0 errors <!-- id: 5.2 -->
  - [ ] 5.3 Create walkthrough document in `docs/verification/pwa-mobile-ui-walkthrough.md` and update `docs/tech/architecture.md` <!-- id: 5.3 -->

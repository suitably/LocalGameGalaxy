# Automatic Server Setup & Installation Wizard Tasks [ID: TASKS-SERVER-AUTO-SETUP]

- [ ] 1. **Localization**: Add translations for German and English in `public/locales/de/translation.json` and `public/locales/en/translation.json` (`server.setup.*`). <!-- id: 1 -->
- [ ] 2. **Automation Scripts**: Add `quick-install.sh` and `quick-install.ps1` in `server/release-scripts/`. <!-- id: 2 -->
- [ ] 3. **Auto-Detect & Token Hook**: Create `src/components/connection/setup/useServerAutoDetect.ts`. <!-- id: 3 -->
- [ ] 4. **Setup Sub-Components (SOLID/SRP)**: <!-- id: 4 -->
  - [ ] 4a. Create `src/components/connection/setup/SetupBinaryTab.tsx` <!-- id: 4a -->
  - [ ] 4b. Create `src/components/connection/setup/SetupDockerTab.tsx` <!-- id: 4b -->
  - [ ] 4c. Create `src/components/connection/setup/SetupCloudflareTab.tsx` <!-- id: 4c -->
  - [ ] 4d. Create `src/components/connection/setup/SetupOneLinerTab.tsx` <!-- id: 4d -->
- [ ] 5. **Main Wizard Component**: Create `src/components/connection/ServerSetupWizard.tsx`. <!-- id: 5 -->
- [ ] 6. **Integration**: Update `src/features/settings/Settings.tsx` to include `ServerSetupWizard` in the Server tab. <!-- id: 6 -->
- [ ] 7. **Validation & Verification**: <!-- id: 7 -->
  - [ ] 7a. Run `npm run lint` and fix any issues. <!-- id: 7a -->
  - [ ] 7b. Run `npm run build` (`tsc -b && vite build`) and ensure clean compile. <!-- id: 7b -->
  - [ ] 7c. Create verification walkthrough `docs/verification/server-auto-setup-walkthrough.md`. <!-- id: 7c -->
- [ ] 8. **Architecture SSoT Update**: Update `docs/tech/architecture.md` and `docs/tech/deployment.md`. <!-- id: 8 -->

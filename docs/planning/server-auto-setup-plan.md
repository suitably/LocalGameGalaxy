# Automatic Server Setup & Installation Wizard Implementation Plan [ID: PLAN-SERVER-AUTO-SETUP]

## Goal Description
Provide an intuitive, zero-friction **Automatic Server Setup & Installation Wizard** in `Settings` -> `Server`.
This enables users to deploy, launch, or self-host their own Nexumia Server in minutes with automated OS detection, pre-configured configuration generation, one-liner installation scripts, 1-click binary downloads, Docker Compose templates, Cloudflare Workers 1-click deploy, and live local auto-detection with automatic pairing.

---

## Architecture & SOLID Component Breakdown

To maintain strict adherence to SRP (Single Responsibility Principle) and file size constraints (<250 lines per file):

```
src/components/connection/
├── ServerConnection.tsx               # Existing: Server connection parameters & test button
├── ServerAdminPanel.tsx               # Existing: API key management
├── ServerSetupWizard.tsx              # Main Setup Assistant container card
└── setup/
    ├── SetupBinaryTab.tsx             # 1-Click Binary download & launch with OS detection
    ├── SetupDockerTab.tsx             # 1-Click Docker run / Docker Compose download with profiles
    ├── SetupCloudflareTab.tsx         # 1-Click Cloudflare Workers 24/7 cloud deploy
    ├── SetupOneLinerTab.tsx           # Quick copy-paste Terminal install scripts (Bash / PS)
    └── useServerAutoDetect.ts         # Hook for polling localhost:3000 and auto-pairing credentials
```

---

## Proposed Changes

### 1. `src/components/connection/setup/useServerAutoDetect.ts`
- Custom hook to manage auto-setup state:
  - Generates secure random crypto master token (stored in localStorage and embedded in generated configs).
  - Detects current user OS (Windows, macOS, Linux).
  - Performs live polling/testing on `http://localhost:3000` / `http://127.0.0.1:3000`.
  - Automatically saves URL & Token to `storage` when connection succeeds and dispatches `server_connection_updated`.

### 2. `src/components/connection/setup/SetupBinaryTab.tsx`
- Auto-detects user OS and highlights corresponding download package (`nexumia-server-win.zip`, `nexumia-server-macos.tar.gz`, `nexumia-server-linux.tar.gz`).
- Generates pre-filled `config.json` download (containing matching security token and port).
- Displays clear 3-step guide: 1. Download & extract, 2. Run launch script (`start-server.bat`/`.command`/`.sh`), 3. Auto-Connect.

### 3. `src/components/connection/setup/SetupDockerTab.tsx`
- Provides 1-click copy for `docker run` command with pre-filled token.
- Provides interactive `docker-compose.yml` download supporting Docker profiles:
  - Core Relay & Media
  - Cloudflare Quick Tunnel (Zero-config public HTTPS)
  - Melodiq AI Worker (Whisper & Stem separation)

### 4. `src/components/connection/setup/SetupCloudflareTab.tsx`
- 1-Click Cloudflare Workers Deploy button for 24/7 remote free multiplayer relay without keeping a local computer running.
- Step-by-step Wrangler deployment command.

### 5. `src/components/connection/setup/SetupOneLinerTab.tsx`
- One-line copy-paste terminal commands for fast headless or developer setup:
  - Linux/macOS Bash installer
  - Windows PowerShell installer

### 6. `src/components/connection/ServerSetupWizard.tsx`
- Clean collapsible or tabbed UI presenting the setup options.
- Live localhost discovery indicator with "Auto-Connect" button.

### 7. `src/features/settings/Settings.tsx`
- Embed `ServerSetupWizard` within the Server tab, above or alongside `ServerConnection` and `ServerAdminPanel`.

### 8. `server/release-scripts/`
- Add `quick-install.sh` (automated script for Linux/macOS) and `quick-install.ps1` (for Windows).

### 9. Localization (`public/locales/de/translation.json` & `public/locales/en/translation.json`)
- Complete translations for all new keys under `server.setup.*`.

---

## Verification Plan

### Automated Checks
- `npm run lint` — verify no ESLint warnings or errors.
- `npm run build` — verify strict TypeScript compilation (`tsc -b`) and Vite production bundle.

### Manual Verification
1. Navigate to Settings -> Server.
2. Confirm the Automatic Server Setup Wizard is clearly rendered.
3. Test switching tabs (Binary, Docker, Cloudflare, 1-Liner).
4. Verify OS detection accurately selects current platform.
5. Verify `config.json` and `docker-compose.yml` download buttons generate valid configuration files with synced tokens.
6. Verify "Auto-Connect" and status checks update `ServerConnection` seamlessly.

---
title: "[i18n][Localization] Localize hardcoded strings in DeviceConnection and ServerAdminPanel"
labels: ["i18n", "ui", "connection", "priority:low"]
assignees: []
---

## Summary
Per `AGENTS.md` (Section 5), hardcoding user-facing strings is forbidden. All user-visible text must use translation hooks (`t('...')`) and have corresponding entries in both German and English locales.
`src/components/connection/DeviceConnection.tsx` and `src/components/connection/ServerAdminPanel.tsx` contain multiple hardcoded English strings.

## Problem Details & Exact Code Locations
1. `src/components/connection/DeviceConnection.tsx`:
   - "Connect Devices"
   - "Host Base URL"
   - "Party ID"
   - "Waiting for connections..."
   - "Connected Peers"
2. `src/components/connection/ServerAdminPanel.tsx`:
   - Admin action labels, status descriptions, and server URL prompts

## Dependencies & Preconditions
- **Dependencies:** None.

## Step-by-Step Implementation Instructions
1. Inspect all untranslated string literals in:
   ```bash
   grep -n '"[A-Z][a-z]' src/components/connection/DeviceConnection.tsx
   grep -n '"[A-Z][a-z]' src/components/connection/ServerAdminPanel.tsx
   ```
2. Locate the project's central translation dictionaries in `src/i18n.ts` or `src/i18n/`.
3. Add entries under a namespace like `connection.` in both German (`de`) and English (`en`):
   ```typescript
   connection: {
     connectDevices: 'Geräte verbinden' / 'Connect Devices',
     hostBaseUrl: 'Host-Basis-URL' / 'Host Base URL',
     partyId: 'Party-ID' / 'Party ID',
     waitingForConnections: 'Warte auf Verbindungen...' / 'Waiting for connections...',
     connectedPeers: 'Verbundene Geräte' / 'Connected Devices',
     // ...
   }
   ```
4. Replace hardcoded strings in the components with `t('connection.key')`.

## Affected Files
- `src/components/connection/DeviceConnection.tsx`
- `src/components/connection/ServerAdminPanel.tsx`
- `src/i18n.ts` (or relevant translation files under `src/i18n/`)

## Acceptance Criteria & Verification
- [ ] No hardcoded English strings remain in `DeviceConnection.tsx` or `ServerAdminPanel.tsx`.
- [ ] Both German and English language settings display localized strings.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.

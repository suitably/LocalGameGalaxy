---
title: "[MEDIUM] Platform-Level Progressive Web App (PWA) Config Tightly Coupled to Single Game"
severity: medium
type: maintainability
domain: Architecture/Coupling
lens: architecture/coupling
labels:
  - "audit:architecture/coupling"
---

## Summary
The platforms build and compilation configuration (`vite.config.ts`) couples the entire repository's Progressive Web App (PWA) configuration to the metadata and routing of a single game: `Melodiq`. It configures the PWA manifest `name` as "Melodiq", `description` as "The ultimate local music game experience", and `start_url` as `/games/melodiq`.

## Impact
This repository is configured as a multi-game portal ("LocalGameGalaxy"), which includes multiple separate games (Werewolf, Imposter, Melodiq) and a central game hub (`Hub.tsx`). Hardcoding PWA registration to automatically redirect to `/games/melodiq` and branding the app specifically as "Melodiq" at the build config level makes the mobile/PWA installation experience confusing and broken for users who want to access other games or start from the Hub page (`/`).

## Evidence
In [vite.config.ts](file:///home/deck/Projects/LocalGameGalaxy/vite.config.ts#L18-L29):
```typescript
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Melodiq',
        short_name: 'Melodiq',
        description: 'The ultimate local music game experience.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/games/melodiq',
        scope: '/',
```

## Recommended Fix
Decouple PWA branding and initialization from Melodiq:
1. Update `name` to "LocalGameGalaxy" or a similar platform-generic brand name.
2. Update the `start_url` in the manifest from `/games/melodiq` to the root path `/` to ensure users land on the hub selection screen upon installing and launch.
3. Keep the description and metadata general to local party games.

## References
- Vite PWA Plugin Documentation (vite-pwa-org.netlify.app)
- Progressive Web App Design Guidelines

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors: vite.config.ts:18-29
- suggested_validation: grep -n "start_url: '/games/melodiq'" vite.config.ts

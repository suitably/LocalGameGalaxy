---
title: "[Refactor][SRP] Decompose DeviceConnection.tsx God Component into focused sub-components"
labels: ["refactoring", "srp", "react", "connection", "priority:medium"]
assignees: []
---

## Summary
`src/components/connection/DeviceConnection.tsx` (478 lines) is a monolithic component handling:
1. QR code layout and scaling calculations
2. WebRTC Tracker configuration and toggle controls
3. Connected peer list rendering and status chip displays
4. Companion helper URL / token configuration
5. Direct `localStorage` calls

Per `AGENTS.md` (Section 4), components exceeding ~250 lines violating SRP should be modularized into sub-components and custom hooks.

## Problem Details & Exact Code Locations
- Component: [`src/components/connection/DeviceConnection.tsx:1-478`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/components/connection/DeviceConnection.tsx#L1)
- Direct `localStorage` calls: Lines 89, 111, 112, 115, 133
- Multiple unrelated concerns mixed in one rendering function

## Dependencies & Preconditions
- **Dependencies:**
  - `ISSUE-SOLID-11` (Storage migration for connection components)
  - `ISSUE-SOLID-14` (Eliminate any types in DeviceConnection)

## Step-by-Step Implementation Instructions
1. Extract helper connection configuration hook:
   Create `src/components/connection/useDeviceConnectionSettings.ts` to manage `baseUrl`, `helperUrl`, `helperToken`, and persistence via `storage.ts`.
2. Extract sub-components under `src/components/connection/`:
   - `DeviceQRCodeCard.tsx` (displays the QR code, link copying, and URL expansion button)
   - `DeviceTrackerSettings.tsx` (collapsible tracker list and status switches)
   - `ConnectedPeersList.tsx` (renders active peer cards and peer action buttons)
3. Refactor `DeviceConnection.tsx` to compose these sub-components with clean props (< 160 lines).
4. Extract i18n keys for any hardcoded strings.

## Affected Files
- `src/components/connection/DeviceConnection.tsx`
- `src/components/connection/useDeviceConnectionSettings.ts` (new)
- `src/components/connection/DeviceQRCodeCard.tsx` (new)
- `src/components/connection/DeviceTrackerSettings.tsx` (new)
- `src/components/connection/ConnectedPeersList.tsx` (new)

## Acceptance Criteria & Verification
- [ ] `DeviceConnection.tsx` is under 180 lines.
- [ ] Each sub-component has a clear, single responsibility and clean TypeScript props.
- [ ] QR code generation and peer list display work seamlessly across all games that embed DeviceConnection.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.

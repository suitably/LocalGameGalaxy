---
title: "[HIGH] Scattered and Direct LocalStorage Access for Helper Configuration"
severity: high
type: maintainability
domain: Architecture
lens: separation-of-concerns
labels:
  - "audit:architecture/separation-of-concerns"
---

## Summary
The configuration parameters for the external helper server (URL, authentication token, and active status) are read from and written to `localStorage` directly in more than a dozen files, including presentation components, API request layers, and custom hooks, instead of being managed by a centralized config service or context.

## Impact
This direct storage access bypasses React's rendering lifecycle and introduces several architectural and maintainability challenges:
1. **Lack of Reactivity**: Directly modifying `localStorage` does not notify components using these settings. For example, if a user updates the helper URL in `HelperConnection.tsx`, active hooks (e.g., `useMediaLoaders`) or the custom `melodiqFetch` logic do not instantly react to the new value unless the page is manually refreshed.
2. **Coupling to Browser Storage**: Core networking and business logic hooks are coupled to the browser-specific, synchronous `localStorage` API. If this application is compiled for Android/iOS via Capacitor, webview `localStorage` is volatile and can be purged by the operating system. Migrating storage to Capacitor `Preferences` (former `Storage`) or a secure storage plugin is high-effort due to the lack of an abstraction layer.
3. **Harder to Test**: Components and hooks cannot be easily unit-tested or simulated in environments where `localStorage` is unavailable or requires tedious mocking.

## Evidence
`localStorage` is accessed for the helper configuration across multiple disparate codebases:
- **API Request Layer**:
  - [melodiqFetch.ts:L2-3](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/api/melodiqFetch.ts#L2-L3)
  ```typescript
  const baseUrl = localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000';
  const token = localStorage.getItem('melodiq_helper_token') || '';
  ```
- **Custom Gameplay Hooks**:
  - [useMediaLoaders.ts:L29-33](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/hooks/useMediaLoaders.ts#L29-L33)
  ```typescript
  const helperUrl = localStorage.getItem('melodiq_helper_url')?.replace(/\/$/, "") || 'http://localhost:3000';
  ...
  const token = localStorage.getItem('melodiq_helper_token');
  ```
- **Connection and Control Components**:
  - [HelperConnection.tsx:L9-11](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/components/HelperConnection.tsx#L9-L11)
  ```typescript
  const [url, setUrl] = useState(() => localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000');
  const [token, setToken] = useState(() => localStorage.getItem('melodiq_helper_token') || '');
  const [enabled, setEnabled] = useState(() => localStorage.getItem('melodiq_enable_helper') !== 'false');
  ```
- **Other Components**:
  - Direct `localStorage` calls also exist in `YouTubeSearchDialog.tsx` (lines 84-85), `SongActionDialogs.tsx` (lines 84, 108, 153), and `PlaybackManager.tsx` (lines 107, 149).

## Recommended Fix
1. Create a `HelperConfigContext` and a corresponding `useHelperConfig` custom hook in a central configuration folder (e.g., `src/context/HelperConfigContext.tsx`).
2. Centralize the state logic for reading, writing, and validating the URL and token in this context.
3. Replace all direct `localStorage.getItem` and `localStorage.setItem` calls in components and hooks with the reactive variables and state-updating functions provided by `useHelperConfig()`.
4. This ensures that any change to the server URL is propagated to the entire application instantly, and isolates storage implementation details.

## References
- React Context API & State Management best practices
- SOLID Principles: Single Responsibility Principle (SRP) in [AGENTS.md](file:///home/deck/Projects/LocalGameGalaxy/AGENTS.md)

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors:
  - `src/games/melodiq/api/melodiqFetch.ts:2`
  - `src/games/melodiq/gameplay/hooks/useMediaLoaders.ts:29`
  - `src/games/melodiq/components/HelperConnection.tsx:9`
- suggested_validation: grep -rn "localStorage.getItem('melodiq_helper" src/

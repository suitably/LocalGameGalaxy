---
title: "[HIGH] Generic Device Connection Component Coupled to Melodiq Implementation Details"
severity: high
type: maintainability
domain: Architecture/Coupling
lens: architecture/coupling
labels:
  - "audit:architecture/coupling"
---

## Summary
The `DeviceConnection` component located in the shared connection components directory (`src/components/connection/DeviceConnection.tsx`) is designed to be a generic helper for connecting mobile controllers. However, its `handleScanSuccess` callback directly hardcodes logic, storage keys, and events that are specific to the `melodiq` game.

## Impact
This tight coupling makes the `DeviceConnection` component non-reusable for other games or modules that require phone connections. If another game uses `DeviceConnection`, scanning a QR code will trigger unintended writes to `melodiq_helper_url` and fire a `melodiq_settings_updated` event, causing side-effects and polluting `localStorage` with unrelated keys.

## Evidence
In [src/components/connection/DeviceConnection.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/components/connection/DeviceConnection.tsx#L71-L87):
```typescript
            // Apply helper config from scanned URL directly to localStorage
            const urlHelper = scannedParams.get('helperUrl');
            const urlToken = scannedParams.get('token') || scannedParams.get('apiKey');

            if (urlHelper) {
                localStorage.setItem('melodiq_helper_url', urlHelper);
                localStorage.setItem('melodiq_enable_helper', 'true');
            }
            if (urlToken) {
                localStorage.setItem('melodiq_helper_token', urlToken);
            }

            // Tell useSongs to reload with the new config
            if (urlHelper || urlToken) {
                window.dispatchEvent(new Event('melodiq_settings_updated'));
            }
```

## Recommended Fix
Remove all game-specific code from `DeviceConnection.tsx`. Instead, pass a generic `onScanSuccess` callback function as a prop to the component, so that game-specific logic (such as setting Melodiq-specific configuration keys and dispatching configuration update events) is completely handled by the calling page component.

## References
- SOLID Principles: Dependency Inversion Principle (DIP)
- React Component Design Patterns: Container and Presentational Components

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors: src/components/connection/DeviceConnection.tsx:75-86
- suggested_validation: grep -n "melodiq_" src/components/connection/DeviceConnection.tsx

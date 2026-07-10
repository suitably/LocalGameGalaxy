---
title: "[MEDIUM] Tight Coupling between Global Layout Shell and Specific Game Routes"
severity: medium
type: maintainability
domain: Architecture/Coupling
lens: architecture/coupling
labels:
  - "audit:architecture/coupling"
---

## Summary
The global Layout header (`GlobalHeader.tsx`) is tightly coupled to specific game paths. It directly checks `location.pathname` to see if it starts with `/games/melodiq` in order to hide the settings icon.

## Impact
This breaks the Open-Closed Principle and the modular boundary of the games. Adding another game that has its own settings, or renaming/refactoring the Melodiq routes, forces changes inside the shared portal UI components. Global layout shells should be completely agnostic of routing details of individual games.

## Evidence
In [src/components/Layout/GlobalHeader.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/components/Layout/GlobalHeader.tsx#L67-L79):
```typescript
                {/* Settings Icon (Global) - Hide on Melodiq routes because they have their own settings */}
                {!location.pathname.startsWith('/games/melodiq') && (
                    <Tooltip title={t('settings.title', 'Settings')}>
                        <IconButton
                            color="inherit"
                            onClick={() => navigate('/settings')}
                            sx={{ ml: 1 }}
                        >
                            <SettingsIcon />
                        </IconButton>
                    </Tooltip>
                )}
```

## Recommended Fix
Extract layout options to a Layout context configuration. Let the individual game pages declare layout configurations (like hiding/showing the global settings icon) on mount via the `useLayout()` hook, rather than hardcoding route path checks inside the header itself.

For example, update `LayoutContext.tsx` to support a `hideSettingsIcon` property in the context state, and let `MelodiqGame` call `useLayout` setting `hideSettingsIcon: true` on mount, which `GlobalHeader` then checks instead of the hardcoded path.

## References
- Clean Architecture (Robert C. Martin)
- SOLID Principles: Open-Closed Principle (OCP)

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors: src/components/Layout/GlobalHeader.tsx:68
- suggested_validation: grep -n "location.pathname.startsWith('/games/melodiq')" src/components/Layout/GlobalHeader.tsx

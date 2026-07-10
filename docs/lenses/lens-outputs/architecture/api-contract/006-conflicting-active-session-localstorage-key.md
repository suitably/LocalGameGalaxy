---
title: "[HIGH] Conflicting Contract and State Corruption on localStorage Key melodiq_active_session"
severity: high
type: reliability-bug
domain: Melodiq State Management
lens: architecture/api-contract
labels:
  - "audit:architecture/api-contract"
  - "bug"
---

## Summary
The `melodiq_active_session` key in `localStorage` is used by two separate state management contexts under conflicting data contracts and structures:
1. The player profiles manager ([useProfiles.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/hooks/useProfiles.ts)) uses it to store the global list of active player profiles participating in the game session lobby (e.g., local players, remote singers, and bots).
2. The queue hook ([useQueue.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/hooks/useQueue.ts)) (within `toggleQueueParticipant` and `reorderQueueParticipant`) overwrites this same key with the list of participants assigned to sing *a specific queued song*.

Because of this namespace overlap, toggling or reordering the singers of any individual song in the queue permanently overwrites the global active lobby configuration in `localStorage` with that song's subset of singers.

## Impact
This leads to severe state corruption. Setting up a session lobby with multiple players and bots, and then configuring/modifying who is singing a song in the queue drawer, completely corrupts and wipes out the main lobby setup. Upon reloading the page or returning to the setup screen, all inactive players, bots, and custom mic latency/volume configs are lost from the session.

## Evidence
In [useProfiles.ts:L10-L13](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/hooks/useProfiles.ts#L10-L13), the lobby state is persisted:
```typescript
const persistProfiles = (profiles: UserProfile[], activePlayers: ActivePlayer[]) => {
    localStorage.setItem('melodiq_profiles', JSON.stringify(profiles));
    localStorage.setItem('melodiq_active_session', JSON.stringify(activePlayers));
};
```

In [useQueue.ts:L238-L240](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/hooks/useQueue.ts#L238-L240), toggling a participant on a queued item overwrites the same key:
```typescript
                if (!isClient) {
                    localStorage.setItem('melodiq_active_session', JSON.stringify(newParticipants));
                }
```

In [useQueue.ts:L262](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/hooks/useQueue.ts#L262), reordering a participant on a queued item also overwrites the same key:
```typescript
                localStorage.setItem('melodiq_active_session', JSON.stringify(participants));
```

This namespace collision violates the principle of contract isolation between the lobby setup state and queue item runtime parameters.

## Recommended Fix
Remove the `localStorage.setItem('melodiq_active_session', ...)` calls entirely from `useQueue.ts`. 

Since the queue items are already fully persisted in the `melodiq_queue` localStorage key (which contains the full list of queued items, including the `participants` array for each item), there is no architectural reason to write a single item's participants list to `melodiq_active_session`.

1. Remove lines 238-240 in `useQueue.ts`:
```diff
-                if (!isClient) {
-                    localStorage.setItem('melodiq_active_session', JSON.stringify(newParticipants));
-                }
```

2. Remove line 262 in `useQueue.ts`:
```diff
-                localStorage.setItem('melodiq_active_session', JSON.stringify(participants));
```

## References
- Namespace isolation and separation of concerns in client-side state storage
- SOLID Single Responsibility Principle applied to storage schemas

## Validation
- attacker_source — n/a
- missing_guard — missing isolation of localStorage namespaces/keys between the global session manager (`useProfiles.ts`) and the song queue manager (`useQueue.ts`)
- sink_effect — updating a queued item's participants overwrites and corrupts the global lobby session setup key in `localStorage`
- preconditions — lobby session is configured with active players, a song is added to the queue, and the user toggles/reorders a participant on that song
- proof_anchors — src/games/melodiq/hooks/useProfiles.ts:12, src/games/melodiq/hooks/useQueue.ts:239, src/games/melodiq/hooks/useQueue.ts:262
- suggested_validation — grep -rn 'melodiq_active_session' src/

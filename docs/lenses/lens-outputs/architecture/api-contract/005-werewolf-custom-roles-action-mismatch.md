---
title: "[HIGH] Werewolf Custom Roles Dispatched Night Actions API Mismatch"
severity: high
type: reliability-bug
domain: Werewolf Game Logic
lens: architecture/api-contract
labels:
  - "audit:architecture/api-contract"
  - "bug"
---

## Summary
The generic custom role night action handler in [NightPhase.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/werewolf/components/NightPhase.tsx) dispatches an invalid action shape of `{ type: ability.type, targetId: id }` for all custom abilities. This violates the API contract of the game reducer ([gameReducer.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/werewolf/logic/gameReducer.ts)) for several core action types:
1. `LINK_LOVERS` expects `{ type: 'LINK_LOVERS', targetIds: [string, string] }` but receives `{ type: 'LINK_LOVERS', targetId: string }`.
2. `GIVE_EGG` expects `{ type: 'GIVE_EGG', targetIds: string[] }` but receives `{ type: 'GIVE_EGG', targetId: string }`.
3. `CHOOSE_CAMP` expects `{ type: 'CHOOSE_CAMP', camp: 'VILLAGER' | 'WEREWOLF' }` but receives `{ type: 'CHOOSE_CAMP', targetId: string }`.

This contract mismatch causes these actions to silently fail (e.g., eggs are never given, lovers are never linked) or corrupt player states (e.g., camp is set to `undefined`), rendering custom roles with these abilities completely broken.

## Impact
This breaks the core custom roles extension architecture. Users can define custom roles with abilities like linking lovers, giving eggs, or choosing alignment, but these abilities will fail to execute or will corrupt game states, leading to broken gameplay sessions.

## Evidence
In [NightPhase.tsx:L167-L184](file:///home/deck/Projects/LocalGameGalaxy/src/games/werewolf/components/NightPhase.tsx#L167-L184), the generic custom role handler assumes all abilities are single-player selections:
```typescript
        if (activeCustomRole) {
            const ability = activeCustomRole.abilities[0];
            if (!ability) return <Box textAlign="center" mt={10}><Button variant="outlined" onClick={nextRole}>{t('common.skip')} {activeRole}</Button></Box>;

            return (
                <PlayerSelectionView
                    icon={<Typography variant="h1">{activeCustomRole.icon}</Typography>}
                    title={activeCustomRole.name}
                    subtitle={activeCustomRole.description}
                    instruction={customInstruction || t(`games.werewolf.editor.ability_instruction_${ability.type.toLowerCase()}`, { count: ability.targetCount })}
                    players={players.filter(p => p.isAlive)}
                    onSelect={(id) => handleAction({ type: ability.type as any, targetId: id })}
                    onSkip={nextRole}
                    skipLabel={t('common.skip')}
                    buttonColor="primary"
                />
            );
        }
```

However, the game reducer in [gameReducer.ts:L297-L300](file:///home/deck/Projects/LocalGameGalaxy/src/games/werewolf/logic/gameReducer.ts#L297-L300) expects `targetIds` array for `GIVE_EGG`:
```typescript
                case 'GIVE_EGG':
                    newPlayers = newPlayers.map(p =>
                        nightAction.targetIds?.includes(p.id) ? { ...p, powerState: { ...p.powerState, hasEgg: true } } : p
                    );
                    break;
```

Similarly, for `CHOOSE_CAMP` in [gameReducer.ts:L302-L306](file:///home/deck/Projects/LocalGameGalaxy/src/games/werewolf/logic/gameReducer.ts#L302-L306):
```typescript
                case 'CHOOSE_CAMP':
                    newPlayers = newPlayers.map(p =>
                        p.role === 'WOLFDOG' ? { ...p, powerState: { ...p.powerState, camp: nightAction.camp } } : p
                    );
                    break;
```
When dispatched from custom roles, `nightAction.camp` is `undefined`, wiping out/setting `camp` to `undefined` on the player.

For `LINK_LOVERS` in [gameReducer.ts:L276-L280](file:///home/deck/Projects/LocalGameGalaxy/src/games/werewolf/logic/gameReducer.ts#L276-L280):
```typescript
                case 'LINK_LOVERS':
                    // Cupid links players - supports multiple links now
                    if (nightAction.targetIds && nightAction.targetIds.length === 2) {
                        const [id1, id2] = nightAction.targetIds;
```
Because `targetIds` is not present in the dispatched action, the `if` check fails and no players are linked.

## Recommended Fix
Modify the generic custom role render block in [NightPhase.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/werewolf/components/NightPhase.tsx) to delegate to specialized views or render multiple inputs based on the ability type:

1. For `CHOOSE_CAMP`, render alignment options rather than a player selection list (similar to [WolfdogView.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/werewolf/components/roles/WolfdogView.tsx)):
```typescript
        if (ability.type === 'CHOOSE_CAMP') {
            return (
                <Box textAlign="center">
                    <Typography variant="h5">{activeCustomRole.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                        <Button size="large" variant="contained" onClick={() => handleAction({ type: 'CHOOSE_CAMP', camp: 'VILLAGER' })}>
                            {t('games.werewolf.roles.VILLAGER')}
                        </Button>
                        <Button size="large" variant="contained" color="error" onClick={() => handleAction({ type: 'CHOOSE_CAMP', camp: 'WEREWOLF' })}>
                            {t('games.werewolf.roles.WEREWOLF')}
                        </Button>
                    </Box>
                </Box>
            );
        }
```

2. For multi-target abilities (e.g., `LINK_LOVERS`, `GIVE_EGG`), allow selecting multiple players and dispatch the array under `targetIds`:
```typescript
        // Implement state for tracking multiple selections, and when count is reached, dispatch:
        handleAction({ type: ability.type, targetIds: selectedIds });
```

## References
- React architectural patterns for modular reducer/state machines
- Finite state machine pattern for game rules verification

## Validation
- attacker_source — n/a
- missing_guard — absence of ability-specific action payload construction/validation in the generic custom role handler in `NightPhase.tsx`
- sink_effect — reducer processes a malformed action payload, leading to silent action failure or corrupted `powerState` values
- preconditions — a custom role is added to the game with `CHOOSE_CAMP`, `LINK_LOVERS`, or `GIVE_EGG` abilities, and that custom role is active during the night phase
- proof_anchors — src/games/werewolf/components/NightPhase.tsx:178, src/games/werewolf/logic/gameReducer.ts:278, src/games/werewolf/logic/gameReducer.ts:299, src/games/werewolf/logic/gameReducer.ts:304
- suggested_validation — grep -n 'targetId: id' src/games/werewolf/components/NightPhase.tsx

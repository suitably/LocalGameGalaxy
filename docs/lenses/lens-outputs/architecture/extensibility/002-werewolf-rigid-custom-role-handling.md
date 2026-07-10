---
title: "[HIGH] Werewolf Custom Role Engine restricts actions to a single ability and target"
severity: high
type: maintainability
domain: architecture
lens: extensibility
labels:
  - "audit:architecture/extensibility"
---

## Summary
The custom role engine in the Werewolf game allows players to define roles with multiple abilities and varying target counts. However, during the night phase UI rendering, the system rigidly selects only the first ability from the custom role definitions (`abilities[0]`), and the generic selection view (`PlayerSelectionView`) only supports single target selection.

## Impact
- Custom roles requiring multiple abilities (e.g. analogous to Witch's heal & kill, or Pyromaniac's oil & burn) cannot function properly; secondary abilities are completely ignored during gameplay.
- Custom roles requiring multiple targets (e.g. analogous to Cupid's link target count of 2) cannot select more than one player, breaking the logic of the ability or failing to trigger.
- This creates a major gap between the Role Editor capability (which allows configuring multiple abilities/targets) and the actual Game Engine execution.

## Evidence

In `src/games/werewolf/components/NightPhase.tsx` lines 167-184:
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
Here, `ability` is hardcoded as `abilities[0]`, and the `onSelect` callback only takes a single `id` and immediately triggers `handleAction(...)`.

In `src/games/werewolf/components/PlayerSelectionView.tsx` line 11:
```typescript
    onSelect: (playerId: string) => void;
```
And its render method triggers selection immediately on clicking any player button (lines 55-67):
```typescript
                    {players.map(p => (
                        <Button
                            key={p.id}
                            variant="contained"
                            color={buttonColor}
                            onClick={() => onSelect(p.id)}
                            sx={{
                                minWidth: 120,
                                height: 60,
                                mb: 1
                            }}
                        >
                            {p.name}
                        </Button>
                    ))}
```

## Recommended Fix
1. Refactor `PlayerSelectionView.tsx` or the night view selection logic to support multi-select when `ability.targetCount > 1` (reusing a stateful list of selected IDs and a confirmation button, similar to the implementation in `CupidView.tsx`).
2. Update `NightPhase.tsx` to iterate or sequence through all night abilities of a custom role rather than hardcoding index `0`.

## References
- Strategy/Chain of Responsibility Pattern
- Open/Closed Principle for game rule components

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: A custom role is defined with multiple abilities, or an ability targeting multiple players.
- proof_anchors:
  - src/games/werewolf/components/NightPhase.tsx:167-184
  - src/games/werewolf/components/PlayerSelectionView.tsx:11
- suggested_validation: grep -A 20 "if (activeCustomRole)" src/games/werewolf/components/NightPhase.tsx

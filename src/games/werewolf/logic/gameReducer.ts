import { INITIAL_STATE, getNextPhase } from './types';
import type { GameState, Role, Action, PlayerPowerState } from './types';
import { generateUUID } from '../../../lib/uuid';
import { getDeathCascade, getWinningFaction, isWerewolfRole } from './utils';
import { DEFAULT_ROLES } from './defaultRoles';


/**
 * `gameReducer` — Werewolf Game State Reducer
 *
 * Pure Redux-pattern reducer that manages all Werewolf game state transitions.
 * All game logic passes through this single function — it is the authoritative
 * source of truth for the game's state machine.
 *
 * ## Key Action Groups
 *
 * ### Setup Actions
 * - `ADD_PLAYER` / `REMOVE_PLAYER` / `CLEAR_ALL_PLAYERS`: Manage the player list before the game starts.
 * - `START_GAME`: Shuffles and assigns roles; initializes per-role `powerState` fields.
 * - `SAVE_CUSTOM_ROLES`: Persists the user-defined custom role library into the state.
 *
 * ### Phase Transitions
 * - `NEXT_PHASE`: Advances the game phase following the sequence:
 *   `SETUP → ROLE_REVEAL → NIGHT → DAY → VOTING → NIGHT → ...`
 *   On `NIGHT → DAY`: Night decisions are **resolved in full** before the phase changes.
 *
 * ### Night Action Collection
 * - `NIGHT_ACTION`: Each role submits one `NightDecision` per night turn. Actions are
 *   collected into `nightDecisions[]` and resolved atomically when NEXT_PHASE fires.
 *
 * ### Night Resolution Order (inside NEXT_PHASE, NIGHT→DAY)
 * 1. Guardian / Survivor protections applied.
 * 2. Werewolf KILL applied (blocked by protection).
 * 3. Witch HEAL overrides kill; Witch KILL applied.
 * 4. Black Werewolf INFECT applied.
 * 5. Pyromaniac BURN applied to all oiled targets.
 * 6. Death cascade via `getDeathCascade()` (Lovers die together).
 * 7. Hunter `HUNTER_SHOT` phase injected if a Hunter was killed.
 * 8. Win condition evaluated via `getWinningFaction()`.
 *
 * @param state - The current immutable `GameState`.
 * @param action - A discriminated union `Action` describing the transition.
 * @returns A new `GameState` object; never mutates the input.
 */
export const gameReducer = (state: GameState, action: Action): GameState => {
    switch (action.type) {
        case 'ADD_PLAYER':
            return {
                ...state,
                players: [
                    ...state.players,
                    {
                        id: generateUUID(),
                        name: action.name,
                        role: null,
                        isAlive: true,
                        needsToAct: false,
                        powerState: {}
                    }
                ]
            };

        case 'REMOVE_PLAYER':
            return {
                ...state,
                players: state.players.filter(p => p.id !== action.id)
            };

        case 'CLEAR_ALL_PLAYERS':
            return {
                ...state,
                players: []
            };

        case 'START_GAME': {
            const { roles } = action;
            const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);

            // Assign roles to ALL players and initialize power states
            const newPlayers = state.players.map((p, idx) => {
                const role = (shuffledRoles[idx] || 'VILLAGER') as Role;
                const powerState: PlayerPowerState = {}; // Using any for initialization convenience

                if (role === 'WITCH') {
                    powerState.hasHealPotion = true;
                    powerState.hasKillPotion = true;
                } else if (role === 'SURVIVOR') {
                    powerState.protectionsLeft = 2;
                } else if (role === 'WISE') {
                    powerState.canSurviveWerewolf = true;
                } else if (role === 'BLACK_WEREWOLF') {
                    powerState.hasInfected = true;
                }

                // Initialize custom role power states dynamically based on abilities
                const customRole = state.customRoles.find(cr => cr.id === role);
                if (customRole && customRole.abilities) {
                    customRole.abilities.forEach(ab => {
                        if (ab.type === 'HEAL') powerState.hasHealPotion = true;
                        if (ab.type === 'KILL') powerState.hasKillPotion = true;
                        if (ab.type === 'PROTECT') powerState.protectionsLeft = ab.usesPerGame ?? 2;
                        if (ab.type === 'INFECT') powerState.hasInfected = true;
                    });
                }

                return {
                    ...p,
                    role,
                    isAlive: true,
                    powerState,
                    needsToAct: false
                };
            });

            return {
                ...state,
                players: newPlayers,
                phase: 'ROLE_REVEAL',
                round: 0, // Round 0 for setup/reveal
                currentTurnPlayerId: newPlayers[0].id
            };
        }

        case 'NEXT_PHASE': {
            const { phase, incrementRound } = getNextPhase(state.phase);
            let newPlayers = state.players;
            let victims: string[] = [];

            // Process deaths from night action log when transitioning to day
            if (phase === 'DAY') {
                victims = getDeathCascade(state.nightActionLog, state.players);
                newPlayers = state.players.map(p =>
                    victims.includes(p.id) ? { ...p, isAlive: false } : p
                );
                // Update log to include cascade victims
                state.nightActionLog = victims;

                // Clear temporary night flags
                newPlayers = newPlayers.map(p => ({
                    ...p,
                    powerState: {
                        ...p.powerState,
                        isProtected: false,
                        isDeadSoon: false,
                        sleepingAt: undefined
                    }
                }));
            }

            const newState = {
                ...state,
                players: newPlayers,
                phase,
                round: incrementRound ? state.round + 1 : state.round,
                nightActionLog: phase === 'NIGHT' ? [] : state.nightActionLog, // Clear log at start of night
                nightDecisions: phase === 'NIGHT' ? [] : state.nightDecisions // Clear decisions at start of night
            };

            // Angel Transformation: If Angel survives the first day, they become a Villager
            if (state.phase === 'VOTING' && state.round === 1 && phase === 'NIGHT') {
                newState.players = newState.players.map(p =>
                    p.role === 'ANGEL' && p.isAlive ? { ...p, role: 'VILLAGER' } : p
                );
            }

            return phase === 'DAY' ? checkHunterDeath(newState, victims) : newState;
        }

        case 'KILL_PLAYER': {
            // Kill player and cascade to lovers
            const victims = getDeathCascade([action.id], state.players);

            const newPlayers = state.players.map(p =>
                victims.includes(p.id) ? { ...p, isAlive: false } : p
            );

            // Check win conditions
            const allRoles = [...DEFAULT_ROLES, ...state.customRoles];
            const winner = getWinningFaction(newPlayers, allRoles, state.phase, state.round, victims);

            if (winner) {
                return {
                    ...state,
                    players: newPlayers,
                    nightActionLog: [...(state.nightActionLog || []), ...victims].filter((v, i, a) => a.indexOf(v) === i),
                    phase: 'GAME_OVER',
                    winner
                };
            }

            const { phase, incrementRound } = getNextPhase(state.phase);
            const finalState = {
                ...state,
                players: newPlayers,
                nightActionLog: [...(state.nightActionLog || []), ...victims].filter((v, i, a) => a.indexOf(v) === i),
                phase,
                round: incrementRound ? state.round + 1 : state.round
            };

            return checkHunterDeath(finalState, victims);
        }

        case 'NIGHT_ACTION': {
            const { action: nightAction, role } = action;
            let newPlayers = [...state.players];
            let newNightActionLog = [...state.nightActionLog];
            const newNightDecisions = [...state.nightDecisions];

            switch (nightAction.type) {
                case 'KILL':
                    // Add to night action log to be processed in morning
                    if (nightAction.targetId) {
                        const targetPlayer = state.players.find(p => p.id === nightAction.targetId);
                        if (targetPlayer?.powerState?.isProtected) {
                            // Target is protected, kill fails
                            break;
                        }

                        // Dorfmatratze Survival Check
                        // If Dorfmatratze is not home (has sleepingAt set to someone else) AND is the target
                        if (targetPlayer?.role === 'DORFMATRATZE' && targetPlayer.powerState.sleepingAt && targetPlayer.powerState.sleepingAt !== targetPlayer.id) {
                            // She is not home, so she survives
                            break;
                        }

                        // Wise Elder Survival Check
                        const allRoles = [...DEFAULT_ROLES, ...state.customRoles];
                        if (targetPlayer?.role === 'WISE' && targetPlayer.powerState.canSurviveWerewolf && isWerewolfRole(role, allRoles)) {
                            // Use up survival and don't kill
                            newPlayers = newPlayers.map(p =>
                                p.id === targetPlayer.id ? { ...p, powerState: { ...p.powerState, canSurviveWerewolf: false } } : p
                            );
                            // Also add a special decision so it shows in summary
                            newNightDecisions.push({ role: 'WISE', action: { type: 'SURVIVE' } });
                            break;
                        }

                        newNightActionLog.push(nightAction.targetId);

                        // Linked Death: Check if any Dorfmatratze is sleeping at the target's house
                        const linkedMatratzen = state.players.filter(p =>
                            p.role === 'DORFMATRATZE' &&
                            p.powerState.sleepingAt === nightAction.targetId &&
                            p.isAlive
                        );

                        linkedMatratzen.forEach(matratze => {
                            if (!newNightActionLog.includes(matratze.id)) {
                                newNightActionLog.push(matratze.id);
                                // Mark Matratze as dead soon too
                                newPlayers = newPlayers.map(p =>
                                    p.id === matratze.id ? { ...p, powerState: { ...p.powerState, isDeadSoon: true } } : p
                                );
                            }
                        });


                        // Mark as dead soon for witch to see
                        newPlayers = newPlayers.map(p =>
                            p.id === nightAction.targetId ? { ...p, powerState: { ...p.powerState, isDeadSoon: true } } : p
                        );
                    }
                    break;
                case 'INFECT': {
                    // Black Werewolf infects a player - they join the werewolf pack
                    const infectedTargetId = nightAction.targetId;

                    // Identify collateral victims who were supposed to die with this target (e.g. Dorfmatratze)
                    const collateralVictimIds = state.players.filter(p =>
                        p.role === 'DORFMATRATZE' &&
                        p.powerState.sleepingAt === infectedTargetId &&
                        p.isAlive
                    ).map(p => p.id);

                    newPlayers = newPlayers.map(p => {
                        if (p.id === infectedTargetId) {
                            return {
                                ...p,
                                role: 'WEREWOLF',
                                powerState: { ...p.powerState, isInfected: true, isDeadSoon: false }
                            };
                        }
                        if (collateralVictimIds.includes(p.id)) {
                            return { ...p, powerState: { ...p.powerState, isDeadSoon: false } };
                        }
                        if (p.role === 'BLACK_WEREWOLF') {
                            return { ...p, powerState: { ...p.powerState, hasInfected: false } };
                        }
                        return p;
                    });

                    // Remove from death log since they are now infected instead of killed
                    const victimsToRemove = [infectedTargetId, ...collateralVictimIds];
                    newNightActionLog = newNightActionLog.filter(id => !victimsToRemove.includes(id));
                    break;
                }
                case 'HEAL':
                    // Witch heals
                    newPlayers = newPlayers.map(p => {
                        if (p.id === nightAction.targetId) {
                            return { ...p, powerState: { ...p.powerState, isDeadSoon: false } };
                        }
                        if (role === 'WITCH') {
                            return { ...p, powerState: { ...p.powerState, hasHealPotion: false } };
                        }
                        return p;
                    });
                    // Remove from log if it was there
                    newNightActionLog = newNightActionLog.filter(id => id !== nightAction.targetId);
                    break;
                case 'PROTECT':
                    // Guardian or Survivor protects
                    newPlayers = newPlayers.map(p => {
                        const targetId = nightAction.targetId || (p.role === 'SURVIVOR' ? p.id : null);
                        if (p.id === targetId) {
                            return { ...p, powerState: { ...p.powerState, isProtected: true } };
                        }
                        if (p.role === 'SURVIVOR' && nightAction.targetId === '') {
                            return { ...p, powerState: { ...p.powerState, protectionsLeft: (p.powerState.protectionsLeft || 0) - 1 } };
                        }
                        return p;
                    });
                    break;
                case 'LINK_LOVERS':
                    // Cupid links players - supports multiple links now
                    if (nightAction.targetIds && nightAction.targetIds.length === 2) {
                        const [id1, id2] = nightAction.targetIds;
                        newPlayers = newPlayers.map(p => {
                            if (p.id === id1) {
                                const current = p.powerState.loverIds || [];
                                if (!current.includes(id2)) {
                                    return { ...p, powerState: { ...p.powerState, loverIds: [...current, id2] } };
                                }
                            }
                            if (p.id === id2) {
                                const current = p.powerState.loverIds || [];
                                if (!current.includes(id1)) {
                                    return { ...p, powerState: { ...p.powerState, loverIds: [...current, id1] } };
                                }
                            }
                            return p;
                        });
                    }
                    break;
                case 'GIVE_EGG':
                    newPlayers = newPlayers.map(p =>
                        nightAction.targetIds?.includes(p.id) ? { ...p, powerState: { ...p.powerState, hasEgg: true } } : p
                    );
                    break;
                case 'CHOOSE_CAMP':
                    newPlayers = newPlayers.map(p =>
                        p.role === 'WOLFDOG' ? { ...p, powerState: { ...p.powerState, camp: nightAction.camp } } : p
                    );
                    break;
                case 'OIL':
                    newPlayers = newPlayers.map(p =>
                        nightAction.targetIds?.includes(p.id) ? { ...p, powerState: { ...p.powerState, isOiled: true } } : p
                    );
                    break;
                case 'BURN':
                    // Burn all oiled players
                    // Add them to night action log so they die in the morning
                    {
                        const oiledPlayerIds = state.players
                            .filter(p => p.powerState.isOiled)
                            .map(p => p.id);

                        // Add unique IDs to the log
                        oiledPlayerIds.forEach(id => {
                            if (!newNightActionLog.includes(id)) {
                                newNightActionLog.push(id);
                            }
                        });

                        // Also mark them dead soon for visibility if needed, though they will die at daybreak
                        newPlayers = newPlayers.map(p =>
                            oiledPlayerIds.includes(p.id) ? { ...p, powerState: { ...p.powerState, isDeadSoon: true } } : p
                        );
                    }
                    break;
                case 'STEAL_ROLE': {
                    // Thief steals a role
                    const thief = state.players.find(p => p.role === 'THIEF');
                    const victim = state.players.find(p => p.id === nightAction.targetId);

                    if (thief && victim) {
                        newPlayers = newPlayers.map(p => {
                            if (p.id === thief.id) {
                                // Thief takes victim's role and initializes fresh power state
                                const newRole = victim.role || 'VILLAGER';
                                let newPowerState: PlayerPowerState = {};

                                // Initialize power state for the stolen role
                                if (newRole === 'WITCH') {
                                    newPowerState = { hasHealPotion: true, hasKillPotion: true };
                                } else if (newRole === 'SURVIVOR') {
                                    newPowerState = { protectionsLeft: 2 };
                                } else if (newRole === 'WISE') {
                                    newPowerState = { canSurviveWerewolf: true };
                                } else if (newRole === 'BLACK_WEREWOLF') {
                                    newPowerState = { hasInfected: true };
                                }

                                return { ...p, role: newRole, powerState: newPowerState };
                            }
                            if (p.id === victim.id) {
                                // Victim becomes Villager (or just loses role)
                                return { ...p, role: 'VILLAGER', powerState: {} };
                            }
                            return p;
                        });
                    }
                    break;
                }
                case 'CURSE':
                    // Black Cat curses a player - they get an extra vote against them
                    newPlayers = newPlayers.map(p =>
                        p.id === nightAction.targetId ? { ...p, powerState: { ...p.powerState, isCursed: true } } : p
                    );
                    break;
                case 'SLEEP':
                    // Dorfmatratze chooses where to sleep
                    newPlayers = newPlayers.map(p =>
                        p.role === 'DORFMATRATZE'
                            ? { ...p, powerState: { ...p.powerState, sleepingAt: nightAction.targetId } }
                            : p
                    );
                    break;
                case 'CHECK_ROLE':
                case 'COMPARE_CAMPS':
                case 'PEEK':
                    // Informational actions: logged to nightDecisions without player state mutations
                    break;
            }

            const tempState = {
                ...state,
                players: newPlayers,
                nightActionLog: newNightActionLog,
                nightDecisions: [...newNightDecisions, { role, action: nightAction }]
            };

            // Check if this action caused a win condition (e.g. Easter Bunny)
            const allRoles = [...DEFAULT_ROLES, ...state.customRoles];
            const winResult = getWinningFaction(newPlayers, allRoles, state.phase, state.round);

            if (winResult) {
                return {
                    ...tempState,
                    phase: 'GAME_OVER',
                    winner: winResult
                };
            }

            return tempState;
        }

        case 'HUNTER_SHOT': {
            const hunterId = state.pendingHunterIds[0];
            const victimId = action.targetId;
            const newPending = state.pendingHunterIds.slice(1);

            // Kill the victim and mark hunter as having shot
            const victims = getDeathCascade([victimId], state.players);
            const newPlayers = state.players.map(p => {
                if (p.id === hunterId) {
                    return { ...p, powerState: { ...p.powerState, hasShot: true } };
                }
                if (victims.includes(p.id)) {
                    return { ...p, isAlive: false };
                }
                return p;
            });

            // Check win conditions after hunter shot
            const allRoles = [...DEFAULT_ROLES, ...state.customRoles];
            const winner = getWinningFaction(newPlayers, allRoles, state.phase, state.round, victims);

            // If there's a winner, end the game immediately
            if (winner) {
                return {
                    ...state,
                    players: newPlayers,
                    phase: 'GAME_OVER',
                    winner,
                    pendingHunterIds: [],
                    nextPhaseAfterShot: null
                };
            }

            const nextPhase = newPending.length > 0 ? 'HUNTER_SHOT' : (state.nextPhaseAfterShot || 'DAY');

            return checkHunterDeath({
                ...state,
                players: newPlayers,
                pendingHunterIds: newPending,
                phase: nextPhase,
                nextPhaseAfterShot: newPending.length > 0 ? state.nextPhaseAfterShot : null
            }, victims);
        }

        case 'RESET_GAME':
            return {
                ...INITIAL_STATE,
                players: state.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    role: null,
                    isAlive: true,
                    needsToAct: false,
                    powerState: {}
                })),
                customRoles: state.customRoles
            };

        case 'RESTORE_STATE':
            return {
                ...action.state,
                customRoles: action.state.customRoles || [],
                nightDecisions: action.state.nightDecisions || []
            };

        case 'SAVE_CUSTOM_ROLES':
            return {
                ...state,
                customRoles: action.roles
            };

        default:
            return state;
    }
};

const checkHunterDeath = (state: GameState, newVictimIds: string[]): GameState => {
    console.log('Checking Hunter Death. Victims:', newVictimIds);
    const newlyDeadHunters = state.players.filter(p =>
        newVictimIds.includes(p.id) &&
        p.role === 'HUNTER' &&
        !p.powerState.hasShot
    ).map(p => p.id);

    console.log('Newly Dead Hunters:', newlyDeadHunters);

    if (newlyDeadHunters.length === 0) return state;

    return {
        ...state,
        phase: 'HUNTER_SHOT',
        pendingHunterIds: [...state.pendingHunterIds, ...newlyDeadHunters],
        nextPhaseAfterShot: state.phase === 'HUNTER_SHOT' ? state.nextPhaseAfterShot : state.phase
    };
};

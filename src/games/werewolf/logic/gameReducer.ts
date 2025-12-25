import { INITIAL_STATE, getNextPhase } from './types';
import type { GameState, Role, Action } from './types';

import { isWerewolf, getDeathCascade } from './utils';
import { DEFAULT_ROLES } from './defaultRoles';


export const gameReducer = (state: GameState, action: Action): GameState => {
    switch (action.type) {
        case 'ADD_PLAYER':
            return {
                ...state,
                players: [
                    ...state.players,
                    {
                        id: crypto.randomUUID(),
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
                const powerState: any = {}; // Using any for initialization convenience

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
                        isDeadSoon: false
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
            const alivePlayers = newPlayers.filter(p => p.isAlive);
            const aliveWerewolves = alivePlayers.filter(p => isWerewolf(p, allRoles)).length;
            const aliveVillagers = alivePlayers.filter(p => !isWerewolf(p, allRoles)).length;

            let winner: 'VILLAGERS' | 'WEREWOLVES' | null = null;
            if (aliveWerewolves === 0) {
                winner = 'VILLAGERS';
            } else if (aliveWerewolves >= aliveVillagers) {
                winner = 'WEREWOLVES';
            }

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

            switch (nightAction.type) {
                case 'KILL':
                    // Add to night action log to be processed in morning
                    if (nightAction.targetId) {
                        const targetPlayer = state.players.find(p => p.id === nightAction.targetId);
                        if (targetPlayer?.powerState?.isProtected) {
                            // Target is protected, kill fails
                            break;
                        }

                        newNightActionLog.push(nightAction.targetId);
                        // Mark as dead soon for witch to see
                        newPlayers = newPlayers.map(p =>
                            p.id === nightAction.targetId ? { ...p, powerState: { ...p.powerState, isDeadSoon: true } } : p
                        );
                    }
                    break;
                case 'INFECT':
                    // Black Werewolf infects a player - they join the werewolf pack
                    newPlayers = newPlayers.map(p => {
                        if (p.id === nightAction.targetId) {
                            return {
                                ...p,
                                role: 'WEREWOLF',
                                powerState: { ...p.powerState, isInfected: true, isDeadSoon: false }
                            };
                        }
                        if (p.role === 'BLACK_WEREWOLF') {
                            return { ...p, powerState: { ...p.powerState, hasInfected: false } };
                        }
                        return p;
                    });
                    // Remove from death log since they are now infected instead of killed
                    newNightActionLog = newNightActionLog.filter(id => id !== nightAction.targetId);
                    break;
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
                                let newPowerState: any = {};

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
            }

            return {
                ...state,
                players: newPlayers,
                nightActionLog: newNightActionLog,
                nightDecisions: [...state.nightDecisions, { role, action: nightAction }]
            };
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
            return INITIAL_STATE;

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
    const newlyDeadHunters = state.players.filter(p =>
        newVictimIds.includes(p.id) &&
        p.role === 'HUNTER' &&
        !p.powerState.hasShot
    ).map(p => p.id);

    if (newlyDeadHunters.length === 0) return state;

    return {
        ...state,
        phase: 'HUNTER_SHOT',
        pendingHunterIds: [...state.pendingHunterIds, ...newlyDeadHunters],
        nextPhaseAfterShot: state.phase === 'HUNTER_SHOT' ? state.nextPhaseAfterShot : state.phase
    };
};

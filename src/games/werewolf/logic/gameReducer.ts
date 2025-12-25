import { INITIAL_STATE, getNextPhase } from './types';
import type { GameState, Role, Action, Player } from './types';

const isWerewolf = (player: Player): boolean => {
    // If infected, they count as a werewolf regardless of original role
    if (player.powerState?.isInfected) {
        return true;
    }

    const role = player.role;
    if (!role) return false;

    // Check specific werewolf roles
    if (role === 'WEREWOLF' || role === 'BLACK_WEREWOLF' || role === 'WHITE_WEREWOLF') {
        return true;
    }

    // Wolfdog chooses camp on first night
    if (role === 'WOLFDOG' && player.powerState?.chosenCamp === 'WEREWOLF') {
        return true;
    }

    return false;
};

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

            // Process deaths from night action log when transitioning to day
            if (phase === 'DAY') {
                newPlayers = state.players.map(p =>
                    state.nightActionLog.includes(p.id) ? { ...p, isAlive: false } : p
                );
            }

            return {
                ...state,
                players: newPlayers,
                phase,
                round: incrementRound ? state.round + 1 : state.round,
                nightActionLog: phase === 'NIGHT' ? [] : state.nightActionLog // Clear log at start of night
            };
        }

        case 'KILL_PLAYER': {
            // Kill player
            const newPlayers = state.players.map(p =>
                p.id === action.id ? { ...p, isAlive: false } : p
            );

            // Check win conditions
            const alivePlayers = newPlayers.filter(p => p.isAlive);
            const aliveWerewolves = alivePlayers.filter(p => isWerewolf(p)).length;
            const aliveVillagers = alivePlayers.filter(p => !isWerewolf(p)).length;

            let winner: 'VILLAGERS' | 'WEREWOLVES' | null = null;
            if (aliveWerewolves === 0) {
                winner = 'VILLAGERS';
            } else if (aliveWerewolves >= aliveVillagers) {
                winner = 'WEREWOLVES';
            }

            // If someone won, go to GAME_OVER
            if (winner) {
                return {
                    ...state,
                    players: newPlayers,
                    nightActionLog: [...(state.nightActionLog || []), action.id],
                    phase: 'GAME_OVER',
                    winner
                };
            }

            // Otherwise continue to next phase
            const { phase, incrementRound } = getNextPhase(state.phase);
            return {
                ...state,
                players: newPlayers,
                nightActionLog: [...(state.nightActionLog || []), action.id],
                phase,
                round: incrementRound ? state.round + 1 : state.round
            };
        }

        case 'NIGHT_ACTION': {
            const { action: nightAction, role } = action;
            let newPlayers = [...state.players];
            let newNightActionLog = [...state.nightActionLog];

            switch (nightAction.type) {
                case 'KILL':
                    // Add to night action log to be processed in morning
                    if (nightAction.targetId) {
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
                    // Cupid links players
                    newPlayers = newPlayers.map(p =>
                        nightAction.targetIds?.includes(p.id) ? { ...p, powerState: { ...p.powerState, isLover: true } } : p
                    );
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
            }

            return {
                ...state,
                players: newPlayers,
                nightActionLog: newNightActionLog
            };
        }

        case 'RESET_GAME':
            return INITIAL_STATE;

        case 'RESTORE_STATE':
            return {
                ...action.state,
                customRoles: action.state.customRoles || []
            };

        default:
            return state;
    }
};

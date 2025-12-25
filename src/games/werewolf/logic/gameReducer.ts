import { INITIAL_STATE, getNextPhase } from './types';
import type { GameState, Role } from './types';

export type Action =
    | { type: 'ADD_PLAYER'; name: string }
    | { type: 'REMOVE_PLAYER'; id: string }
    | { type: 'START_GAME'; roles: Role[]; isNarratorMode: boolean } // shuffle and assign
    | { type: 'NEXT_PHASE' }
    | { type: 'KILL_PLAYER'; id: string }
    | { type: 'RESET_GAME' }
    | { type: 'RESTORE_STATE'; state: GameState };

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
                        needsToAct: false
                    }
                ]
            };

        case 'REMOVE_PLAYER':
            return {
                ...state,
                players: state.players.filter(p => p.id !== action.id)
            };

        case 'START_GAME': {
            const { roles, isNarratorMode } = action;
            const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);

            // Assign roles to ALL players
            const newPlayers = state.players.map((p, idx) => ({
                ...p,
                role: (shuffledRoles[idx] || 'VILLAGER') as Role,
                isAlive: true,
            }));

            return {
                ...state,
                players: newPlayers,
                phase: 'ROLE_REVEAL',
                round: 1,
                isNarratorMode,
                currentTurnPlayerId: newPlayers[0].id // Start with first player for reveal
            };
        }

        case 'NEXT_PHASE': {
            const { phase, incrementRound } = getNextPhase(state.phase);
            return {
                ...state,
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
            const aliveWerewolves = alivePlayers.filter(p => p.role === 'WEREWOLF').length;
            const aliveVillagers = alivePlayers.filter(p => p.role !== 'WEREWOLF').length;

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

        case 'RESET_GAME':
            return INITIAL_STATE;

        case 'RESTORE_STATE':
            return action.state;

        default:
            return state;
    }
};

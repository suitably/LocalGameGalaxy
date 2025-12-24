import { INITIAL_STATE } from './types';
import type { GameState, Role } from './types';

export type Action =
    | { type: 'ADD_PLAYER'; name: string }
    | { type: 'REMOVE_PLAYER'; id: string }
    | { type: 'START_GAME'; roles: Role[] } // shuffle and assign
    | { type: 'NEXT_PHASE' }
    | { type: 'KILL_PLAYER'; id: string }
    | { type: 'RESET_GAME' };

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
            // Simple shuffle and assign logic
            const shuffledRoles = [...action.roles].sort(() => Math.random() - 0.5);
            const newPlayers = state.players.map((p, idx) => ({
                ...p,
                role: shuffledRoles[idx] || 'VILLAGER', // fallback
                isAlive: true,
            }));

            return {
                ...state,
                players: newPlayers,
                phase: 'ROLE_REVEAL',
                round: 1,
                currentTurnPlayerId: newPlayers[0].id // Start with first player for reveal
            };
        }

        case 'NEXT_PHASE': {
            // Logic to transition phase
            // This needs to be more robust for a real game (handling Night loop), 
            // but for MVP transition: Setup -> Reveal -> Night -> Day

            if (state.phase === 'ROLE_REVEAL') {
                // If passed through all players
                // For simplicity, let's assume UI handles the "Next Player" in reveal, 
                // and this action triggers "Start Night"
                return { ...state, phase: 'NIGHT' };
            }

            if (state.phase === 'NIGHT') {
                return { ...state, phase: 'DAY' };
            }

            if (state.phase === 'DAY') {
                // After day comes night again (increment round)
                return { ...state, phase: 'NIGHT', round: state.round + 1 };
            }

            return state;
        }

        case 'RESET_GAME':
            return INITIAL_STATE;

        default:
            return state;
    }
};

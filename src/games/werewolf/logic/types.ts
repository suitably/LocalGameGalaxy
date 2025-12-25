export type Role = 'VILLAGER' | 'WEREWOLF' | 'SEER' | 'WITCH' | 'HUNTER';

export type PlayerId = string;

export interface Player {
    id: PlayerId;
    name: string;
    role: Role | null;
    isAlive: boolean;
    needsToAct: boolean; // For night phase interaction
}

export type GamePhase =
    | 'SETUP'
    | 'ROLE_REVEAL'
    | 'NIGHT'
    | 'DAY'
    | 'VOTING'
    | 'GAME_OVER';

export interface GameState {
    players: Player[];
    phase: GamePhase;
    round: number; // Night 1, Day 1, Night 2...
    currentTurnPlayerId: PlayerId | null; // For Pass & Play Role Reveal or Night actions
    nightActionLog: string[]; // Who did what during night
    winner: 'VILLAGERS' | 'WEREWOLVES' | null;
    isNarratorMode: boolean; // true means a human is narrating (Dashboard mode)
}

export const INITIAL_STATE: GameState = {
    players: [],
    phase: 'SETUP',
    round: 0,
    currentTurnPlayerId: null,
    nightActionLog: [],
    winner: null,
    isNarratorMode: false,
};

// Modular phase configuration - easily change game flow order here
export const GAME_PHASES: GamePhase[] = ['SETUP', 'ROLE_REVEAL', 'NIGHT', 'DAY'];

// Get next phase in the game flow
export const getNextPhase = (current: GamePhase): { phase: GamePhase; incrementRound: boolean } => {
    switch (current) {
        case 'SETUP':
            return { phase: 'ROLE_REVEAL', incrementRound: false };
        case 'ROLE_REVEAL':
            return { phase: 'NIGHT', incrementRound: true }; // Round 1 starts
        case 'NIGHT':
            return { phase: 'DAY', incrementRound: false };
        case 'DAY':
            return { phase: 'NIGHT', incrementRound: true }; // New round
        default:
            return { phase: current, incrementRound: false };
    }
};

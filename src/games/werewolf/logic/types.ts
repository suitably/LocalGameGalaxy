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
}

export const INITIAL_STATE: GameState = {
    players: [],
    phase: 'SETUP',
    round: 0,
    currentTurnPlayerId: null,
    nightActionLog: [],
    winner: null,
};

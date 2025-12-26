export type GamePhase = 'LOBBY' | 'HANDOVER' | 'TIMER' | 'VOTING' | 'RESULT';

export interface Player {
    id: string;
    name: string;
    isImposter: boolean;
    isKicked?: boolean;
}

export interface DbCategory {
    id: string;
    name: {
        en: string;
        de: string;
    };
}

export interface DbWordPair {
    id?: number;
    words: {
        en: [string, string];
        de: [string, string];
    };
    categoryIds: string[];
}

export interface GameState {
    phase: GamePhase;
    players: Player[];
    selectedCategories: DbCategory[];
    selectedWord: string | null;
    selectedHint: string | null;
    imposterCount: number;
    timerLength: number; // in seconds
    remainingTime: number;
    isPaused: boolean;
    currentPlayerIndex: number; // for handover
    winner: 'IMPOSTERS' | 'NORMAL' | null;
}

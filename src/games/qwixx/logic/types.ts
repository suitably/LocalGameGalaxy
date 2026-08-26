export type RowColor = 'red' | 'yellow' | 'green' | 'blue';

export interface RowState {
    crossed: number[];
    isLocked: boolean;
}

export interface PlayerSheet {
    id: string;
    name: string;
    red: RowState;
    yellow: RowState;
    green: RowState;
    blue: RowState;
    misses: number; // 0 to 4
}

export interface DiceValues {
    white1: number;
    white2: number;
    red: number;
    yellow: number;
    green: number;
    blue: number;
}

export interface QwixxGameState {
    mySheet: PlayerSheet;
    opponents: PlayerSheet[];
    dice: DiceValues;
    isRolling: boolean;
    isMultiplayer: boolean;
    roomId: string;
    activePlayerId: string;
    isGameOver: boolean;
}

export type QwixxAction =
    | { type: 'CROSS_NUMBER'; color: RowColor; number: number }
    | { type: 'LOCK_ROW'; color: RowColor }
    | { type: 'ADD_MISS' }
    | { type: 'REMOVE_MISS' }
    | { type: 'SET_DICE'; dice: DiceValues }
    | { type: 'START_ROLL' }
    | { type: 'FINISH_ROLL'; dice: DiceValues }
    | { type: 'UPDATE_OPPONENT'; sheet: PlayerSheet }
    | { type: 'RESET_GAME' }
    | { type: 'SET_ROOM_ID'; roomId: string }
    | { type: 'SET_PLAYER_NAME'; name: string };

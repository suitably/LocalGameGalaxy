export type RowColor = 'red' | 'yellow' | 'green' | 'blue';

export type QwixxSheetType =
    | 'classic'
    | 'gemixxt_a'
    | 'gemixxt_b'
    | 'big_points'
    | 'connected_stairs'
    | 'connected_chains'
    | 'double_sub'
    | 'double_numbers'
    | 'bonus'
    | 'longo'
    | 'random_mix';

export type QwixxBonusEffect =
    | { type: 'self_cross' } // Cross next valid number in same row
    | { type: 'partner_cross'; targetColor: RowColor } // Cross next valid number in partner row
    | { type: 'shield' }; // Absorbs next miss

export interface SheetCell {
    number: number;
    color: RowColor; // Display color & roll matching color
    isStair?: boolean; // Part of Connected Stairs 5th category
    chainId?: string; // Connected Chains linked partner identifier
    hasSubBox?: boolean; // Double variant sub-box
    isDouble?: boolean; // Double number variant (counts as 2 crosses)
    bonusEffect?: QwixxBonusEffect; // Bonus icons effect
}

export interface SheetRowDefinition {
    id: string; // 'red' | 'yellow' | 'green' | 'blue' | 'bonus_red_yellow' | 'bonus_green_blue'
    defaultColor: RowColor;
    isBonusRow?: boolean;
    linkedRows?: RowColor[]; // For Big Points: which rows get the bonus crosses
    cells: SheetCell[];
    lockNumber: number;
    lockColor: RowColor;
}

export interface SheetDefinition {
    id: QwixxSheetType;
    nameKey: string;
    descriptionKey: string;
    badgeKey: string;
    rows: SheetRowDefinition[];
    presets?: SheetRowDefinition[][]; // Alternative predefined layouts (e.g. Block 1, Block 2, Block 3)
    presetNames?: string[]; // Keys or names for each preset layout
    hasBonusRows?: boolean;
    bonusRows?: SheetRowDefinition[];
    hasStairScoring?: boolean;
}

export interface RowState {
    crossed: number[];
    isLocked: boolean;
    subCrossed?: number[]; // Numbers that have their sub-box crossed (for double_sub)
}

export interface PlayerSheet {
    id: string;
    name: string;
    sheetType: QwixxSheetType;
    presetIndex?: number;
    customRows?: SheetRowDefinition[]; // For dynamic randomized layouts
    red: RowState;
    yellow: RowState;
    green: RowState;
    blue: RowState;
    bonusRows?: Record<string, RowState>; // For Big Points (e.g. bonus_red_yellow, bonus_green_blue)
    misses: number; // 0 to 4
    shields?: number; // Active shields from bonus icons
    luckyNumbers?: [number, number]; // For Qwixx Longo
}

export interface DiceValues {
    white1: number;
    white2: number;
    red: number;
    yellow: number;
    green: number;
    blue: number;
}

export interface QwixxScoreBreakdown {
    red: number;
    yellow: number;
    green: number;
    blue: number;
    bonusRedYellow?: number;
    bonusGreenBlue?: number;
    stairsBonus?: number;
    missesPenalty: number;
    total: number;
}

export interface QwixxGameState {
    mySheet: PlayerSheet;
    dice: DiceValues;
    isRolling: boolean;
    roomId?: string;
    isMultiplayer?: boolean;
}

export type QwixxAction =
    | { type: 'CROSS_NUMBER'; color: RowColor; number: number; isBonusRow?: boolean; rowId?: string }
    | { type: 'CROSS_SUB_BOX'; color: RowColor; number: number }
    | { type: 'LOCK_ROW'; color: RowColor }
    | { type: 'UNLOCK_ROW'; color: RowColor }
    | { type: 'ADD_MISS' }
    | { type: 'REMOVE_MISS' }
    | { type: 'CHANGE_SHEET_TYPE'; sheetType: QwixxSheetType; presetIndex?: number; customRows?: SheetRowDefinition[] }
    | { type: 'SET_DICE'; dice: DiceValues }
    | { type: 'START_ROLL' }
    | { type: 'FINISH_ROLL'; dice: DiceValues }
    | { type: 'RESET_GAME' };

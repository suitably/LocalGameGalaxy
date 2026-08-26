import type { PlayerSheet, QwixxGameState, QwixxAction, RowColor, DiceValues } from './types';

export const ROW_NUMBERS: Record<RowColor, number[]> = {
    red: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    yellow: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    green: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
    blue: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
};

export const calculateRowScore = (crossCount: number): number => {
    if (crossCount <= 0) return 0;
    return (crossCount * (crossCount + 1)) / 2;
};

export const calculateTotalScore = (sheet: PlayerSheet): {
    red: number;
    yellow: number;
    green: number;
    blue: number;
    missesPenalty: number;
    total: number;
} => {
    const redCount = sheet.red.crossed.length + (sheet.red.isLocked ? 1 : 0);
    const yellowCount = sheet.yellow.crossed.length + (sheet.yellow.isLocked ? 1 : 0);
    const greenCount = sheet.green.crossed.length + (sheet.green.isLocked ? 1 : 0);
    const blueCount = sheet.blue.crossed.length + (sheet.blue.isLocked ? 1 : 0);

    const red = calculateRowScore(redCount);
    const yellow = calculateRowScore(yellowCount);
    const green = calculateRowScore(greenCount);
    const blue = calculateRowScore(blueCount);
    const missesPenalty = sheet.misses * 5;

    const total = red + yellow + green + blue - missesPenalty;

    return { red, yellow, green, blue, missesPenalty, total };
};

export const createInitialSheet = (name = 'Player 1'): PlayerSheet => ({
    id: crypto.randomUUID(),
    name,
    red: { crossed: [], isLocked: false },
    yellow: { crossed: [], isLocked: false },
    green: { crossed: [], isLocked: false },
    blue: { crossed: [], isLocked: false },
    misses: 0
});

export const INITIAL_DICE: DiceValues = {
    white1: 1,
    white2: 1,
    red: 1,
    yellow: 1,
    green: 1,
    blue: 1
};

export const INITIAL_STATE: QwixxGameState = {
    mySheet: createInitialSheet(),
    opponents: [],
    dice: INITIAL_DICE,
    isRolling: false,
    isMultiplayer: false,
    roomId: '',
    activePlayerId: '',
    isGameOver: false
};

export function canCrossNumber(rowNumbers: number[], crossed: number[], numToCross: number): boolean {
    const targetIndex = rowNumbers.indexOf(numToCross);
    if (targetIndex === -1) return false;
    if (crossed.includes(numToCross)) return false; // Already crossed — use canUncrossNumber instead

    // Must be to the right of all previously crossed numbers
    const lastCrossed = crossed[crossed.length - 1];
    if (lastCrossed !== undefined) {
        const lastIndex = rowNumbers.indexOf(lastCrossed);
        if (targetIndex <= lastIndex) return false;
    }

    return true;
}

export function canUncrossNumber(crossed: number[], num: number): boolean {
    // Can only uncross the most recently crossed number
    return crossed.length > 0 && crossed[crossed.length - 1] === num;
}

export function canLockRow(rowNumbers: number[], crossed: number[], numToCross: number): boolean {
    const lastNumber = rowNumbers[rowNumbers.length - 1];
    // crossed does NOT yet include numToCross, so total after crossing = crossed.length + 1
    // Qwixx rule: need at least 5 crosses INCLUDING the lock number
    return numToCross === lastNumber && crossed.length + 1 >= 5;
}

export function qwixxReducer(state: QwixxGameState, action: QwixxAction): QwixxGameState {
    switch (action.type) {
        case 'CROSS_NUMBER': {
            const { color, number } = action;
            const currentRow = state.mySheet[color];
            if (currentRow.isLocked) return state;

            const numbers = ROW_NUMBERS[color];
            const isAlreadyCrossed = currentRow.crossed.includes(number);

            let newCrossed: number[];
            let newIsLocked: boolean = currentRow.isLocked;

            if (isAlreadyCrossed) {
                // Only allow uncrossing the most recently crossed number
                if (!canUncrossNumber(currentRow.crossed, number)) {
                    return state;
                }
                newCrossed = currentRow.crossed.slice(0, -1);
            } else {
                if (!canCrossNumber(numbers, currentRow.crossed, number)) {
                    return state;
                }

                // If crossing the last number, check if row should lock
                if (canLockRow(numbers, currentRow.crossed, number)) {
                    newIsLocked = true;
                }

                newCrossed = [...currentRow.crossed, number];
            }

            const updatedSheet: PlayerSheet = {
                ...state.mySheet,
                [color]: {
                    ...currentRow,
                    crossed: newCrossed,
                    isLocked: newIsLocked
                }
            };

            return {
                ...state,
                mySheet: updatedSheet
            };
        }

        case 'LOCK_ROW': {
            const { color } = action;
            const currentRow = state.mySheet[color];
            const numbers = ROW_NUMBERS[color];
            const lastNumber = numbers[numbers.length - 1];

            if (currentRow.isLocked || currentRow.crossed.length < 5 || !currentRow.crossed.includes(lastNumber)) {
                return state;
            }

            return {
                ...state,
                mySheet: {
                    ...state.mySheet,
                    [color]: {
                        ...currentRow,
                        isLocked: true
                    }
                }
            };
        }

        case 'UNLOCK_ROW': {
            const { color } = action;
            const currentRow = state.mySheet[color];
            if (!currentRow.isLocked) return state;

            return {
                ...state,
                mySheet: {
                    ...state.mySheet,
                    [color]: {
                        ...currentRow,
                        isLocked: false
                    }
                }
            };
        }

        case 'ADD_MISS': {
            if (state.mySheet.misses >= 4) return state;
            return {
                ...state,
                mySheet: {
                    ...state.mySheet,
                    misses: state.mySheet.misses + 1
                }
            };
        }

        case 'REMOVE_MISS': {
            if (state.mySheet.misses <= 0) return state;
            return {
                ...state,
                mySheet: {
                    ...state.mySheet,
                    misses: state.mySheet.misses - 1
                }
            };
        }

        case 'START_ROLL':
            return {
                ...state,
                isRolling: true
            };

        case 'FINISH_ROLL':
            return {
                ...state,
                dice: action.dice,
                isRolling: false
            };

        case 'SET_DICE':
            return {
                ...state,
                dice: action.dice
            };

        case 'UPDATE_OPPONENT': {
            const existingIndex = state.opponents.findIndex(o => o.id === action.sheet.id);
            const newOpponents = [...state.opponents];
            if (existingIndex >= 0) {
                newOpponents[existingIndex] = action.sheet;
            } else {
                newOpponents.push(action.sheet);
            }
            return {
                ...state,
                opponents: newOpponents
            };
        }

        case 'SET_ROOM_ID':
            return {
                ...state,
                roomId: action.roomId,
                isMultiplayer: !!action.roomId
            };

        case 'SET_PLAYER_NAME':
            return {
                ...state,
                mySheet: {
                    ...state.mySheet,
                    name: action.name
                }
            };

        case 'RESET_GAME':
            return {
                ...INITIAL_STATE,
                mySheet: createInitialSheet(state.mySheet.name),
                opponents: state.opponents.map(o => createInitialSheet(o.name))
            };

        default:
            return state;
    }
}

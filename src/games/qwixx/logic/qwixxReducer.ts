import type {
    PlayerSheet,
    RowState,
    QwixxGameState,
    QwixxAction,
    RowColor,
    DiceValues,
    QwixxSheetType,
    QwixxScoreBreakdown,
    SheetRowDefinition
} from './types';
import { getSheetDefinition, getSheetRows, generateRandomSheetRows } from './sheetDefinitions';

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

export const getRowNumbersForSheet = (sheet: PlayerSheet, rowId: string): number[] => {
    const rows = getSheetRows(sheet.sheetType, sheet.presetIndex, sheet.customRows);
    const regularRow = rows.find((r) => r.id === rowId);
    if (regularRow) return regularRow.cells.map((c) => c.number);

    const sheetDef = getSheetDefinition(sheet.sheetType);
    const bonusRow = sheetDef.bonusRows?.find((r) => r.id === rowId);
    if (bonusRow) return bonusRow.cells.map((c) => c.number);

    return (ROW_NUMBERS as Record<string, number[]>)[rowId] || [];
};

export const getRowCrossCount = (
    rowDef: SheetRowDefinition,
    rowState: RowState,
    sheetType?: QwixxSheetType
): number => {
    let count = rowState.crossed.length;
    if (sheetType === 'double_numbers') {
        rowDef.cells.forEach((cell) => {
            if (cell.isDouble && rowState.crossed.includes(cell.number)) {
                count += 1;
            }
        });
    }
    if (rowState.subCrossed) {
        count += rowState.subCrossed.length;
    }
    return count;
};

export const calculateTotalScore = (sheet: PlayerSheet): QwixxScoreBreakdown => {
    const rows = getSheetRows(sheet.sheetType || 'classic', sheet.presetIndex, sheet.customRows);

    const counts: Record<RowColor, number> = {
        red: 0,
        yellow: 0,
        green: 0,
        blue: 0
    };

    // 1. Count crosses per cell color across all regular rows
    rows.forEach((rowDef) => {
        const rowState = sheet[rowDef.defaultColor];
        if (!rowState) return;

        rowDef.cells.forEach((cell) => {
            if (rowState.crossed.includes(cell.number)) {
                counts[cell.color] += 1;

                // Double number bonus (double_numbers variant)
                if (cell.isDouble && sheet.sheetType === 'double_numbers') {
                    counts[cell.color] += 1;
                }
            }

            // Sub-box bonus (double_sub variant)
            if (rowState.subCrossed?.includes(cell.number)) {
                counts[cell.color] += 1;
            }
        });

        // Row lock bonus counts for the row's lockColor (e.g. in Gemixxt A row 1 lock is Blue)
        if (rowState.isLocked) {
            const lockColor = rowDef.lockColor || rowDef.defaultColor;
            counts[lockColor] += 1;
        }
    });

    // 2. Big Points Bonus Rows: Add bonus crosses to BOTH linked color rows
    let bonusRedYellowCount = 0;
    let bonusGreenBlueCount = 0;

    if (sheet.sheetType === 'big_points' && sheet.bonusRows) {
        const ryRow = sheet.bonusRows.bonus_red_yellow;
        const gbRow = sheet.bonusRows.bonus_green_blue;

        if (ryRow) {
            bonusRedYellowCount = ryRow.crossed.length;
            counts.red += bonusRedYellowCount;
            counts.yellow += bonusRedYellowCount;
        }

        if (gbRow) {
            bonusGreenBlueCount = gbRow.crossed.length;
            counts.green += bonusGreenBlueCount;
            counts.blue += bonusGreenBlueCount;
        }
    }

    const red = calculateRowScore(counts.red);
    const yellow = calculateRowScore(counts.yellow);
    const green = calculateRowScore(counts.green);
    const blue = calculateRowScore(counts.blue);

    // 3. Stairs Scoring (5th Category)
    let stairsBonus: number | undefined;
    if (sheet.sheetType === 'connected_stairs') {
        let stairCrossCount = 0;
        rows.forEach((rowDef) => {
            const rowState = sheet[rowDef.defaultColor];
            if (!rowState) return;
            rowDef.cells.forEach((cell) => {
                if (cell.isStair && rowState.crossed.includes(cell.number)) {
                    stairCrossCount += 1;
                }
            });
        });
        stairsBonus = calculateRowScore(stairCrossCount);
    }

    const missesPenalty = sheet.misses * 5;
    const total = red + yellow + green + blue + (stairsBonus || 0) - missesPenalty;

    return {
        red,
        yellow,
        green,
        blue,
        bonusRedYellow: bonusRedYellowCount > 0 ? bonusRedYellowCount : undefined,
        bonusGreenBlue: bonusGreenBlueCount > 0 ? bonusGreenBlueCount : undefined,
        stairsBonus,
        missesPenalty,
        total
    };
};

export const createInitialSheet = (
    name = 'Player 1',
    sheetType: QwixxSheetType = 'classic',
    presetIndex = 0,
    customRows?: SheetRowDefinition[]
): PlayerSheet => {
    const sheetDef = getSheetDefinition(sheetType);
    let resolvedCustomRows = customRows;

    if (sheetType === 'random_mix' && !resolvedCustomRows) {
        resolvedCustomRows = generateRandomSheetRows();
    }

    const sheet: PlayerSheet = {
        id: crypto.randomUUID(),
        name,
        sheetType,
        presetIndex,
        customRows: resolvedCustomRows,
        red: { crossed: [], isLocked: false, subCrossed: [] },
        yellow: { crossed: [], isLocked: false, subCrossed: [] },
        green: { crossed: [], isLocked: false, subCrossed: [] },
        blue: { crossed: [], isLocked: false, subCrossed: [] },
        misses: 0,
        shields: 0
    };

    if (sheetDef.hasBonusRows && sheetDef.bonusRows) {
        sheet.bonusRows = {};
        sheetDef.bonusRows.forEach((bRow) => {
            sheet.bonusRows![bRow.id] = { crossed: [], isLocked: false, subCrossed: [] };
        });
    }

    return sheet;
};

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
    if (crossed.includes(numToCross)) return false;

    // Must be to the right of all previously crossed numbers
    const lastCrossed = crossed[crossed.length - 1];
    if (lastCrossed !== undefined) {
        const lastIndex = rowNumbers.indexOf(lastCrossed);
        if (targetIndex <= lastIndex) return false;
    }

    return true;
}

export function canUncrossNumber(crossed: number[], num: number): boolean {
    return crossed.length > 0 && crossed[crossed.length - 1] === num;
}

export function canLockRow(
    rowDef: SheetRowDefinition,
    rowState: RowState,
    numToCross: number,
    sheetType?: QwixxSheetType
): boolean {
    if (numToCross !== rowDef.lockNumber) return false;
    const lockCell = rowDef.cells.find((c) => c.number === numToCross);
    const lockBonus = (lockCell?.isDouble && sheetType === 'double_numbers') ? 2 : 1;
    const currentCount = getRowCrossCount(rowDef, rowState, sheetType);
    return currentCount + lockBonus >= 5;
}

export function canCrossBigPointsBonus(
    sheet: PlayerSheet,
    bonusRowId: string,
    numToCross: number
): boolean {
    const bonusRowState = sheet.bonusRows?.[bonusRowId];
    if (!bonusRowState) return false;

    const rowNumbers = getRowNumbersForSheet(sheet, bonusRowId);
    if (!canCrossNumber(rowNumbers, bonusRowState.crossed, numToCross)) return false;

    // Must have at least one cross in the same column in adjacent rows
    if (bonusRowId === 'bonus_red_yellow') {
        return sheet.red.crossed.includes(numToCross) || sheet.yellow.crossed.includes(numToCross);
    } else if (bonusRowId === 'bonus_green_blue') {
        return sheet.green.crossed.includes(numToCross) || sheet.blue.crossed.includes(numToCross);
    }

    return false;
}

export function qwixxReducer(state: QwixxGameState, action: QwixxAction): QwixxGameState {
    const currentSheetType = state.mySheet.sheetType || 'classic';
    const rows = getSheetRows(currentSheetType, state.mySheet.presetIndex, state.mySheet.customRows);

    switch (action.type) {
        case 'CROSS_NUMBER': {
            const { color, number, isBonusRow, rowId } = action;

            // Handle Big Points Bonus Row crossing
            if (isBonusRow && rowId && state.mySheet.bonusRows) {
                const bonusRowState = state.mySheet.bonusRows[rowId];
                if (!bonusRowState) return state;

                const isAlreadyCrossed = bonusRowState.crossed.includes(number);

                let newCrossed: number[];
                if (isAlreadyCrossed) {
                    if (!canUncrossNumber(bonusRowState.crossed, number)) return state;
                    newCrossed = bonusRowState.crossed.slice(0, -1);
                } else {
                    if (!canCrossBigPointsBonus(state.mySheet, rowId, number)) return state;
                    newCrossed = [...bonusRowState.crossed, number];
                }

                return {
                    ...state,
                    mySheet: {
                        ...state.mySheet,
                        bonusRows: {
                            ...state.mySheet.bonusRows,
                            [rowId]: {
                                ...bonusRowState,
                                crossed: newCrossed
                            }
                        }
                    }
                };
            }

            // Standard color row crossing
            const currentRow = state.mySheet[color];
            if (currentRow.isLocked) return state;

            const rowDef = rows.find((r) => r.id === color);
            if (!rowDef) return state;

            const rowNumbers = rowDef.cells.map((c) => c.number);
            const cell = rowDef.cells.find((c) => c.number === number);
            const isAlreadyCrossed = currentRow.crossed.includes(number);
            const subCrossed = currentRow.subCrossed || [];
            const isAlreadySubCrossed = subCrossed.includes(number);

            // Double Sub Variant Cycle Handling (1st tap: cross main, 2nd tap: check sub, 3rd tap: uncross both/reset)
            if (currentSheetType === 'double_sub' && cell?.hasSubBox) {
                if (!isAlreadyCrossed) {
                    // Tap 1: Cross main box
                    if (!canCrossNumber(rowNumbers, currentRow.crossed, number)) {
                        return state;
                    }
                    const isLock = canLockRow(rowDef, currentRow, number, currentSheetType);
                    return {
                        ...state,
                        mySheet: {
                            ...state.mySheet,
                            [color]: {
                                ...currentRow,
                                crossed: [...currentRow.crossed, number],
                                isLocked: isLock ? true : currentRow.isLocked
                            }
                        }
                    };
                } else if (!isAlreadySubCrossed) {
                    // Tap 2: Check the sub-box
                    return {
                        ...state,
                        mySheet: {
                            ...state.mySheet,
                            [color]: {
                                ...currentRow,
                                subCrossed: [...subCrossed, number]
                            }
                        }
                    };
                } else {
                    // Tap 3: Reset both back to uncrossed if rightmost, or toggle sub-box off
                    const canUncrossMain = canUncrossNumber(currentRow.crossed, number);
                    if (canUncrossMain) {
                        return {
                            ...state,
                            mySheet: {
                                ...state.mySheet,
                                [color]: {
                                    ...currentRow,
                                    crossed: currentRow.crossed.slice(0, -1),
                                    subCrossed: subCrossed.filter((n) => n !== number),
                                    isLocked: false
                                }
                            }
                        };
                    } else {
                        return {
                            ...state,
                            mySheet: {
                                ...state.mySheet,
                                [color]: {
                                    ...currentRow,
                                    subCrossed: subCrossed.filter((n) => n !== number)
                                }
                            }
                        };
                    }
                }
            }

            let newCrossed: number[];
            let newIsLocked: boolean = currentRow.isLocked;

            if (isAlreadyCrossed) {
                if (!canUncrossNumber(currentRow.crossed, number)) {
                    return state;
                }
                newCrossed = currentRow.crossed.slice(0, -1);
            } else {
                if (!canCrossNumber(rowNumbers, currentRow.crossed, number)) {
                    return state;
                }

                if (canLockRow(rowDef, currentRow, number, currentSheetType)) {
                    newIsLocked = true;
                }

                newCrossed = [...currentRow.crossed, number];
            }

            let updatedSheet: PlayerSheet = {
                ...state.mySheet,
                [color]: {
                    ...currentRow,
                    crossed: newCrossed,
                    isLocked: newIsLocked
                }
            };

            // 1. Connected Chains Variant: Auto-cross connected partner cell if allowed
            if (currentSheetType === 'connected_chains' && !isAlreadyCrossed) {
                const chainCell = rowDef.cells.find((c) => c.number === number);
                if (chainCell?.chainId) {
                    rows.forEach((otherRowDef) => {
                        if (otherRowDef.id === color) return;
                        const partnerCell = otherRowDef.cells.find((c) => c.chainId === chainCell.chainId);
                        if (partnerCell) {
                            const partnerColor = otherRowDef.defaultColor;
                            const partnerRow = updatedSheet[partnerColor];
                            const partnerNumbers = otherRowDef.cells.map((c) => c.number);

                            if (!partnerRow.isLocked && canCrossNumber(partnerNumbers, partnerRow.crossed, partnerCell.number)) {
                                const partnerIsLock = canLockRow(otherRowDef, partnerRow, partnerCell.number, currentSheetType);
                                updatedSheet = {
                                    ...updatedSheet,
                                    [partnerColor]: {
                                        ...partnerRow,
                                        crossed: [...partnerRow.crossed, partnerCell.number],
                                        isLocked: partnerIsLock ? true : partnerRow.isLocked
                                    }
                                };
                            }
                        }
                    });
                }
            }

            // 2. Bonus Variant: Activate real bonus effects
            if (currentSheetType === 'bonus' && !isAlreadyCrossed) {
                const bonusCell = rowDef.cells.find((c) => c.number === number);
                if (bonusCell?.bonusEffect) {
                    if (bonusCell.bonusEffect.type === 'self_cross') {
                        // Auto-cross next eligible number in the same row
                        const nextNum = rowNumbers.find((n) => canCrossNumber(rowNumbers, updatedSheet[color].crossed, n));
                        if (nextNum !== undefined) {
                            const isNextLock = canLockRow(rowDef, updatedSheet[color], nextNum, currentSheetType);
                            updatedSheet = {
                                ...updatedSheet,
                                [color]: {
                                    ...updatedSheet[color],
                                    crossed: [...updatedSheet[color].crossed, nextNum],
                                    isLocked: isNextLock ? true : updatedSheet[color].isLocked
                                }
                            };
                        }
                    } else if (bonusCell.bonusEffect.type === 'partner_cross') {
                        // Auto-cross next eligible number in partner color row
                        const targetColor = bonusCell.bonusEffect.targetColor;
                        const targetRowDef = rows.find((r) => r.id === targetColor);
                        const targetRowState = updatedSheet[targetColor];
                        if (targetRowDef && !targetRowState.isLocked) {
                            const targetNumbers = targetRowDef.cells.map((c) => c.number);
                            const nextTargetNum = targetNumbers.find((n) => canCrossNumber(targetNumbers, targetRowState.crossed, n));
                            if (nextTargetNum !== undefined) {
                                const isTargetLock = canLockRow(targetRowDef, targetRowState, nextTargetNum, currentSheetType);
                                updatedSheet = {
                                    ...updatedSheet,
                                    [targetColor]: {
                                        ...targetRowState,
                                        crossed: [...targetRowState.crossed, nextTargetNum],
                                        isLocked: isTargetLock ? true : targetRowState.isLocked
                                    }
                                };
                            }
                        }
                    } else if (bonusCell.bonusEffect.type === 'shield') {
                        // Gain an active shield to absorb future misses
                        updatedSheet = {
                            ...updatedSheet,
                            shields: (updatedSheet.shields || 0) + 1
                        };
                    }
                }
            }

            return {
                ...state,
                mySheet: updatedSheet
            };
        }

        case 'CROSS_SUB_BOX': {
            const { color, number } = action;
            const currentRow = state.mySheet[color];
            if (currentRow.isLocked || !currentRow.crossed.includes(number)) return state;

            const subCrossed = currentRow.subCrossed || [];
            const isSubCrossed = subCrossed.includes(number);

            const newSubCrossed = isSubCrossed
                ? subCrossed.filter((n) => n !== number)
                : [...subCrossed, number];

            return {
                ...state,
                mySheet: {
                    ...state.mySheet,
                    [color]: {
                        ...currentRow,
                        subCrossed: newSubCrossed
                    }
                }
            };
        }

        case 'LOCK_ROW': {
            const { color } = action;
            const currentRow = state.mySheet[color];
            const rowDef = rows.find((r) => r.id === color);
            if (!rowDef) return state;

            const lastNumber = rowDef.lockNumber;
            const currentCount = getRowCrossCount(rowDef, currentRow, currentSheetType);

            if (currentRow.isLocked || currentCount < 5 || !currentRow.crossed.includes(lastNumber)) {
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
            // If the player has active shields from bonus cells, absorb the miss!
            if (state.mySheet.shields && state.mySheet.shields > 0) {
                return {
                    ...state,
                    mySheet: {
                        ...state.mySheet,
                        shields: state.mySheet.shields - 1
                    }
                };
            }

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

        case 'CHANGE_SHEET_TYPE': {
            return {
                ...state,
                mySheet: createInitialSheet(state.mySheet.name, action.sheetType, action.presetIndex, action.customRows)
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
            const existingIndex = state.opponents.findIndex((o) => o.id === action.sheet.id);
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
                mySheet: createInitialSheet(state.mySheet.name, currentSheetType, state.mySheet.presetIndex, state.mySheet.customRows),
                opponents: state.opponents.map((o) => createInitialSheet(o.name, o.sheetType || currentSheetType, o.presetIndex, o.customRows))
            };

        default:
            return state;
    }
}

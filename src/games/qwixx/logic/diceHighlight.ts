import type { DiceValues, PlayerSheet, RowColor } from './types';
import { canCrossNumber } from './qwixxReducer';
import { getSheetRows } from './sheetDefinitions';

/** Key identifiers for each physical die. */
export type DieKey = keyof DiceValues;

/**
 * Given a clicked die key, the current dice values, and the player's sheet,
 * compute which numbers should be highlighted on each row.
 *
 * White die -> white1+white2 sum in ANY row where it satisfies crossing rules.
 * Colored die -> (color + white1) and (color + white2) on cells that match this color.
 *
 * Respects variant layouts, custom presets, and randomized rows.
 */
export function computeHighlightedNumbers(
    dieKey: DieKey,
    dice: DiceValues,
    sheet: PlayerSheet
): Partial<Record<RowColor, number[]>> {
    const result: Partial<Record<RowColor, number[]>> = {};
    const rows = getSheetRows(sheet.sheetType || 'classic', sheet.presetIndex, sheet.customRows);
    const isWhite = dieKey === 'white1' || dieKey === 'white2';

    if (isWhite) {
        const whiteSum = dice.white1 + dice.white2;

        for (const rowDef of rows) {
            const color = rowDef.defaultColor;
            const rowState = sheet[color];
            if (rowState.isLocked) continue;

            const rowNumbers = rowDef.cells.map((c) => c.number);
            if (rowNumbers.includes(whiteSum) && canCrossNumber(rowNumbers, rowState.crossed, whiteSum)) {
                result[color] = [whiteSum];
            }
        }
    } else {
        // Colored die: compute sums with each white die
        const color = dieKey as RowColor;
        const colorValue = dice[color];
        const sum1 = colorValue + dice.white1;
        const sum2 = colorValue + dice.white2;

        for (const rowDef of rows) {
            const rowColor = rowDef.defaultColor;
            const rowState = sheet[rowColor];
            if (rowState.isLocked) continue;

            const rowNumbers = rowDef.cells.map((c) => c.number);
            const highlighted: number[] = [];

            // Check each cell in the row to see if it matches the die's color and one of the sums
            rowDef.cells.forEach((cell) => {
                const cellColorMatches = cell.color === color;
                if (!cellColorMatches) return;

                if ((cell.number === sum1 || cell.number === sum2) && canCrossNumber(rowNumbers, rowState.crossed, cell.number)) {
                    if (!highlighted.includes(cell.number)) {
                        highlighted.push(cell.number);
                    }
                }
            });

            if (highlighted.length > 0) {
                result[rowColor] = highlighted;
            }
        }
    }

    return result;
}

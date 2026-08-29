import type { DiceValues, PlayerSheet, RowColor } from './types';
import { ROW_NUMBERS, canCrossNumber } from './qwixxReducer';

/** Key identifiers for each physical die. */
export type DieKey = keyof DiceValues;

/**
 * Given a clicked die key, the current dice values, and the player's sheet,
 * compute which numbers should be highlighted on each row.
 *
 * White die → white1+white2 sum in ALL rows.
 * Colored die → (color + white1) and (color + white2) in that color's row only.
 *
 * Only numbers that satisfy the crossing rules (exist in row, not already
 * crossed, to the right of the last cross) are included.
 */
export function computeHighlightedNumbers(
    dieKey: DieKey,
    dice: DiceValues,
    sheet: PlayerSheet
): Partial<Record<RowColor, number[]>> {
    const result: Partial<Record<RowColor, number[]>> = {};
    const isWhite = dieKey === 'white1' || dieKey === 'white2';

    if (isWhite) {
        const whiteSum = dice.white1 + dice.white2;
        const colors: RowColor[] = ['red', 'yellow', 'green', 'blue'];

        for (const color of colors) {
            const row = sheet[color];
            if (row.isLocked) continue;

            const numbers = ROW_NUMBERS[color];
            if (numbers.includes(whiteSum) && canCrossNumber(numbers, row.crossed, whiteSum)) {
                result[color] = [whiteSum];
            }
        }
    } else {
        // Colored die: compute sums with each white die in the matching row only
        const color = dieKey as RowColor;
        const row = sheet[color];
        if (row.isLocked) return result;

        const numbers = ROW_NUMBERS[color];
        const colorValue = dice[color];
        const sum1 = colorValue + dice.white1;
        const sum2 = colorValue + dice.white2;

        const highlighted: number[] = [];

        if (numbers.includes(sum1) && canCrossNumber(numbers, row.crossed, sum1)) {
            highlighted.push(sum1);
        }
        if (sum2 !== sum1 && numbers.includes(sum2) && canCrossNumber(numbers, row.crossed, sum2)) {
            highlighted.push(sum2);
        }

        if (highlighted.length > 0) {
            result[color] = highlighted;
        }
    }

    return result;
}

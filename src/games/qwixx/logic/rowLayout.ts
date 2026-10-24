import type { RowColor, RowState, SheetCell, SheetRowDefinition } from './types';
import { canCrossNumber, canUncrossNumber } from './qwixxReducer';

export interface RowSegment {
  color: RowColor;
  cells: SheetCell[];
  isLastSegment: boolean;
}

/** Groups consecutive cells of the same colour (multi-coloured rows render one block per colour). */
export const buildRowSegments = (rowDef: SheetRowDefinition): RowSegment[] => {
  const segments: RowSegment[] = [];
  rowDef.cells.forEach((cell) => {
    const last = segments[segments.length - 1];
    if (last && last.color === cell.color) {
      last.cells.push(cell);
    } else {
      segments.push({ color: cell.color, cells: [cell], isLastSegment: false });
    }
  });
  if (segments.length > 0) segments[segments.length - 1].isLastSegment = true;
  return segments;
};

/**
 * Whether a cell can be tapped. Sub-box cells (double_sub) are always tappable once crossed:
 * the next taps tick the sub-box and then reset it.
 */
export const isCellClickable = (
  cell: SheetCell,
  rowNumbers: number[],
  rowState: RowState,
): boolean => {
  const num = cell.number;
  const isCrossed = rowState.crossed.includes(num);
  if (cell.hasSubBox) {
    return isCrossed ? true : canCrossNumber(rowNumbers, rowState.crossed, num);
  }
  return isCrossed
    ? canUncrossNumber(rowState.crossed, num)
    : canCrossNumber(rowNumbers, rowState.crossed, num);
};

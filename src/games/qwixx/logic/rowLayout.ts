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
 * Splits segments into two display lines for narrow phones. The lock/star slot counts as one
 * slot, so an 11-cell row becomes 6 cells + (5 cells + lock). Segments crossing the split are
 * cut; only the final segment of the second line keeps `isLastSegment`.
 */
export const splitSegmentsIntoLines = (segments: RowSegment[]): RowSegment[][] => {
  const total = segments.reduce((sum, seg) => sum + seg.cells.length, 0);
  const firstLineSize = Math.ceil((total + 1) / 2);
  const lines: RowSegment[][] = [[], []];
  let used = 0;
  segments.forEach((seg) => {
    const room = Math.max(0, firstLineSize - used);
    const head = seg.cells.slice(0, room);
    const tail = seg.cells.slice(room);
    used += seg.cells.length;
    if (head.length > 0)
      lines[0].push({
        color: seg.color,
        cells: head,
        isLastSegment: seg.isLastSegment && tail.length === 0,
      });
    if (tail.length > 0) {
      lines[1].push({ color: seg.color, cells: tail, isLastSegment: seg.isLastSegment });
    }
  });
  return lines[1].length === 0 ? [lines[0]] : lines;
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

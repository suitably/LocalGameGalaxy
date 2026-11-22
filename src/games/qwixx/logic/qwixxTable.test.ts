import { describe, expect, it } from 'vitest';
import { createInitialSheet, qwixxReducer, INITIAL_STATE } from './qwixxReducer';
import {
  isQwixxTable,
  openSheet,
  resetTable,
  tableFromNames,
  tableScores,
  withOpenSheet,
} from './qwixxTable';

describe('qwixx sheets for several players on one device', () => {
  const template = createInitialSheet('Anna', 'classic');

  it('creates one empty sheet per name of the same type', () => {
    const table = tableFromNames(['Anna', 'Ben', 'Cem'], template);
    expect(table.sheets.map((s) => s.name)).toEqual(['Anna', 'Ben', 'Cem']);
    expect(table.sheets.every((s) => s.sheetType === 'classic')).toBe(true);
    expect(table.activeIndex).toBe(0);
    expect(isQwixxTable(table)).toBe(true);
  });

  it('keeps the crosses of the open sheet when another sheet opens', () => {
    const table = tableFromNames(['Anna', 'Ben'], template);
    const state = qwixxReducer(
      { ...INITIAL_STATE, mySheet: table.sheets[0] },
      { type: 'CROSS_NUMBER', color: 'red', number: 2 },
    );
    const opened = openSheet(table, state.mySheet, 1)!;
    expect(opened.sheet.name).toBe('Ben');
    expect(opened.table.activeIndex).toBe(1);
    expect(opened.table.sheets[0].red.crossed).toEqual([2]);
    const loaded = qwixxReducer(state, { type: 'LOAD_SHEET', sheet: opened.sheet });
    expect(loaded.mySheet.name).toBe('Ben');
    expect(tableScores(opened.table, loaded.mySheet).map((s) => s.total)).toEqual([1, 0]);
    expect(openSheet(table, state.mySheet, 5)).toBeNull();
  });

  it('starts every sheet over on a new game', () => {
    const table = tableFromNames(['Anna', 'Ben'], template);
    const crossed = qwixxReducer(
      { ...INITIAL_STATE, mySheet: table.sheets[1] },
      { type: 'CROSS_NUMBER', color: 'red', number: 2 },
    ).mySheet;
    const played = withOpenSheet({ ...table, activeIndex: 1 }, crossed);
    const reset = resetTable(
      { ...played, activeIndex: 0 },
      createInitialSheet('Anna', 'big_points'),
    );
    expect(reset.sheets[1].red.crossed).toEqual([]);
    expect(reset.sheets[1].name).toBe('Ben');
    expect(reset.sheets[1].sheetType).toBe('big_points');
  });

  it('rejects a stored table with fewer than two sheets or a bad index', () => {
    expect(isQwixxTable(null)).toBe(false);
    expect(isQwixxTable({ sheets: [template], activeIndex: 0 })).toBe(false);
    expect(isQwixxTable({ sheets: [template, template], activeIndex: 2 })).toBe(false);
  });
});

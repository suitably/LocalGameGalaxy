/**
 * Several Qwixx sheets on one device [ID: GAME-QWIXX-LOCAL-TABLE]
 *
 * The open sheet is the reducer's `mySheet`; the table keeps every player's sheet and which one
 * is open. The entry at `activeIndex` is refreshed from `mySheet` whenever the table is read or
 * another sheet is opened, so `mySheet` stays the only source for the open sheet.
 */
import { calculateTotalScore, createInitialSheet } from './qwixxReducer';
import type { PlayerSheet } from './types';

export interface QwixxTable {
  sheets: PlayerSheet[];
  activeIndex: number;
}

const freshSheet = (name: string, template: PlayerSheet): PlayerSheet =>
  createInitialSheet(name, template.sheetType, template.presetIndex, template.customRows);

/** A new table with an empty sheet per name, all of the template's sheet type. */
export function tableFromNames(names: string[], template: PlayerSheet): QwixxTable {
  return { sheets: names.map((name) => freshSheet(name, template)), activeIndex: 0 };
}

/** The table with the open sheet written back. */
export function withOpenSheet(table: QwixxTable, mySheet: PlayerSheet): QwixxTable {
  return {
    ...table,
    sheets: table.sheets.map((s, i) => (i === table.activeIndex ? mySheet : s)),
  };
}

/** Opens sheet `index`; returns the table and the sheet to load into the reducer. */
export function openSheet(
  table: QwixxTable,
  mySheet: PlayerSheet,
  index: number,
): { table: QwixxTable; sheet: PlayerSheet } | null {
  if (index < 0 || index >= table.sheets.length) return null;
  const sheets = withOpenSheet(table, mySheet).sheets;
  return { table: { sheets, activeIndex: index }, sheet: sheets[index] };
}

/** New game: every player gets an empty sheet of the open sheet's type. */
export function resetTable(table: QwixxTable, template: PlayerSheet): QwixxTable {
  return {
    activeIndex: table.activeIndex,
    sheets: table.sheets.map((s, i) =>
      i === table.activeIndex ? template : freshSheet(s.name, template),
    ),
  };
}

/** Name and total of every sheet, the open one read from `mySheet`. */
export function tableScores(
  table: QwixxTable,
  mySheet: PlayerSheet,
): { id: string; name: string; total: number }[] {
  return withOpenSheet(table, mySheet).sheets.map((s, i) => ({
    id: String(i),
    name: s.name,
    total: calculateTotalScore(s).total,
  }));
}

/** Guard for a stored table. */
export function isQwixxTable(value: unknown): value is QwixxTable {
  const t = value as QwixxTable | null;
  return (
    !!t &&
    Array.isArray(t.sheets) &&
    t.sheets.length > 1 &&
    t.sheets.every((s) => s && s.red && s.yellow && s.green && s.blue) &&
    Number.isInteger(t.activeIndex) &&
    t.activeIndex >= 0 &&
    t.activeIndex < t.sheets.length
  );
}

/**
 * Qwixx with everyone on their own device [ID: GAME-QWIXX-ROOM]
 *
 * Each device keeps its own sheet (the single-device reducer); the room shares the dice, whose
 * turn it is to roll, who is done with the current roll, and every player's score summary. After
 * a roll everyone crosses (or not) and taps "done"; once all are done the next player rolls.
 * A row a player closes (crossing its lock number) is closed for everybody: the other sheets lock
 * it too (`rowsToLock`); two closed rows or four misses end the game.
 */
import { calculateTotalScore, getLockNumbers, INITIAL_DICE } from './qwixxReducer';
import { getSheetRows } from './sheetDefinitions';
import type { DiceValues, PlayerSheet, RowColor } from './types';

export interface QwixxBoardSummary {
  total: number;
  misses: number;
  locked: RowColor[];
}

export interface QwixxRoomState {
  hostId: string;
  players: { id: string; name: string }[];
  /** New with every game (from the host), so each device starts a fresh sheet for it. */
  gameId: string;
  dice: DiceValues;
  rollerIndex: number;
  /** The dice of this turn are on the table (rolled, not everyone done yet). */
  rolled: boolean;
  done: string[];
  boards: Record<string, QwixxBoardSummary>;
  isGameOver: boolean;
}

export type QwixxRoomAction =
  | { type: 'START'; hostId: string; gameId: string; players: { id: string; name: string }[] }
  | { type: 'ROLL'; dice: DiceValues }
  | { type: 'DONE'; playerId: string }
  | { type: 'REPORT'; playerId: string; summary: QwixxBoardSummary }
  | { type: 'NEW_GAME'; gameId: string };

export const INITIAL_QWIXX_ROOM: QwixxRoomState = {
  hostId: '',
  players: [],
  gameId: '',
  dice: INITIAL_DICE,
  rollerIndex: 0,
  rolled: false,
  done: [],
  boards: {},
  isGameOver: false,
};

const COLORS: RowColor[] = ['red', 'yellow', 'green', 'blue'];

/** The player closed this row on their own sheet (locked with a lock number crossed). */
function closedOnSheet(sheet: PlayerSheet, color: RowColor): boolean {
  const row = sheet[color];
  if (!row.isLocked) return false;
  const rows = getSheetRows(sheet.sheetType || 'classic', sheet.presetIndex, sheet.customRows);
  const def = rows.find((r) => r.id === color) ?? rows.find((r) => r.defaultColor === color);
  return !!def && getLockNumbers(def).some((n) => row.crossed.includes(n));
}

/**
 * What a device tells the room about its sheet. `locked` lists only rows this player closed,
 * not rows locked because someone else closed them.
 */
export function summarizeSheet(sheet: PlayerSheet): QwixxBoardSummary {
  return {
    total: calculateTotalScore(sheet).total,
    misses: sheet.misses,
    locked: COLORS.filter((c) => closedOnSheet(sheet, c)),
  };
}

export const sameSummary = (a: QwixxBoardSummary | undefined, b: QwixxBoardSummary) =>
  !!a && a.total === b.total && a.misses === b.misses && a.locked.join() === b.locked.join();

/** Rows closed on any sheet. */
export function closedRows(state: Pick<QwixxRoomState, 'boards'>): RowColor[] {
  return [...new Set(Object.values(state.boards).flatMap((b) => b.locked))];
}

/** Rows other players closed that are still open on this sheet: lock them (no bonus). */
export function rowsToLock(sheet: PlayerSheet, state: QwixxRoomState, myId: string): RowColor[] {
  const others = Object.fromEntries(Object.entries(state.boards).filter(([id]) => id !== myId));
  return closedRows({ boards: others }).filter((c) => !sheet[c].isLocked);
}

function gameOver(boards: Record<string, QwixxBoardSummary>): boolean {
  return closedRows({ boards }).length >= 2 || Object.values(boards).some((b) => b.misses >= 4);
}

export function qwixxRoomReducer(state: QwixxRoomState, action: QwixxRoomAction): QwixxRoomState {
  switch (action.type) {
    case 'START':
      return {
        ...INITIAL_QWIXX_ROOM,
        hostId: action.hostId,
        players: action.players.map(({ id, name }) => ({ id, name })),
        gameId: action.gameId,
      };
    case 'NEW_GAME':
      return {
        ...INITIAL_QWIXX_ROOM,
        hostId: state.hostId,
        players: state.players,
        gameId: action.gameId,
      };
    case 'ROLL':
      if (state.rolled || state.isGameOver || state.players.length === 0) return state;
      return { ...state, dice: action.dice, rolled: true, done: [] };
    case 'DONE': {
      if (!state.rolled || state.done.includes(action.playerId)) return state;
      const done = [...state.done, action.playerId];
      if (!state.players.every((p) => done.includes(p.id))) return { ...state, done };
      return {
        ...state,
        done: [],
        rolled: false,
        rollerIndex: (state.rollerIndex + 1) % state.players.length,
      };
    }
    case 'REPORT': {
      const boards = { ...state.boards, [action.playerId]: action.summary };
      return { ...state, boards, isGameOver: state.isGameOver || gameOver(boards) };
    }
    default:
      return state;
  }
}

/** Host-side rule: only the roller rolls, players act for themselves, the host restarts. */
export function qwixxRoomAllows(
  state: QwixxRoomState,
  action: QwixxRoomAction,
  from: string,
): boolean {
  switch (action.type) {
    case 'START':
    case 'NEW_GAME':
      return from === state.hostId || !state.hostId;
    case 'ROLL':
      return state.players[state.rollerIndex]?.id === from;
    default:
      return action.playerId === from && state.players.some((p) => p.id === from);
  }
}

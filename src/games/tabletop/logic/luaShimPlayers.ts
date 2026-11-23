/**
 * Lua shim: players, turns and notes [ID: LOGIC-TABLETOP-LUA-SHIM-PLAYERS]
 *
 * TTS player colours map to seat indices through `scripts.seatColors` (the importer's
 * `assignSeats`), else the TTS FogColor order. A seat counts as seated when a player took it;
 * a table where nobody took a seat (pass and play, solo) treats every seat as seated.
 * `Turns.turn_color = c` becomes `NEXT_TURN {seat}`.
 */
import type { LuaValue } from './luaVm';
import type { SeatWidget, TabletopGameDefinition, TabletopWidget } from './types';
import { getSeatWidgets, seatsForHands } from './seatLogic';
import { handsInSeatOrder } from './dealCards';
import { turnSeatIndex } from './turnOrder';
import { FOG_COLOR_ORDER } from './ttsFidelity';
import { objectRef, type LuaShimHost } from './luaShimTypes';
import { asLuaTable, luaString } from './luaVm';

type Widgets = Record<string, TabletopWidget>;

/** Player methods the shim answers; others are reported as unshimmed by the Lua side. */
export const LUA_PLAYER_METHODS = ['getHandObjects', 'getHandCount', 'broadcast', 'print'];

export const tableSeats = (widgets: Widgets): SeatWidget[] => {
  const seats = getSeatWidgets(widgets);
  return seats.length > 0 ? seats : seatsForHands(widgets);
};

export function seatColor(game: Pick<TabletopGameDefinition, 'scripts'>, index: number): string {
  return game.scripts?.seatColors?.[index] || FOG_COLOR_ORDER[index] || `Seat${index + 1}`;
}

export function seatOfColor(game: TabletopGameDefinition, color: string): number | undefined {
  const lower = color.toLowerCase();
  return tableSeats(game.widgets).find((s) => seatColor(game, s.index).toLowerCase() === lower)
    ?.index;
}

/** Hand holder id of a player colour. */
export function handOfColor(game: TabletopGameDefinition, color: string): string | undefined {
  const seat = seatOfColor(game, color);
  if (seat === undefined) return undefined;
  const fromSeat = tableSeats(game.widgets).find((s) => s.index === seat)?.hand;
  if (fromSeat && game.widgets[fromSeat]) return fromSeat;
  return handsInSeatOrder(game.widgets).find((h) => h.ownerSeat === seat)?.id;
}

export function seatedColors(game: TabletopGameDefinition): string[] {
  const seats = tableSeats(game.widgets);
  const taken = seats.filter((s) => s.player);
  return (taken.length > 0 ? taken : seats).map((s) => seatColor(game, s.index));
}

function handCards(game: TabletopGameDefinition, color: string): string[] {
  const hand = handOfColor(game, color);
  const holder = hand ? game.widgets[hand] : undefined;
  return holder?.type === 'holder' ? holder.childIds.filter((id) => game.widgets[id]) : [];
}

/** `Player[color].method(…)` and its fields. */
export function playerCall(
  host: LuaShimHost,
  color: string,
  method: string,
  args: unknown[],
): LuaValue | undefined {
  const game = host.game();
  const seat = seatOfColor(game, color);
  const seatWidget = tableSeats(game.widgets).find((s) => s.index === seat);
  switch (method) {
    case 'field:seated':
      return seatedColors(game).includes(color);
    case 'field:steam_name':
      return seatWidget?.player ?? seatWidget?.label ?? color;
    case 'field:admin':
    case 'field:host':
      return false;
    case 'getHandObjects':
      return handCards(game, color).map(objectRef);
    case 'getHandCount':
      return handCards(game, color).length;
    case 'broadcast':
    case 'print':
      host.print(luaString(args[0]), typeof args[1] === 'string' ? args[1] : undefined, color);
      return undefined;
    default:
      return undefined;
  }
}

/** `Turns.*`: `get:turn_color`, `set:turn_color`, `get:enable`, `next`, `previous`. */
export function turnsCall(host: LuaShimHost, op: string, value: unknown): LuaValue | undefined {
  const game = host.game();
  const seats = tableSeats(game.widgets);
  const current = seats.findIndex((s) => s.index === turnSeatIndex(game.widgets));
  const colorAt = (offset: number) =>
    seats.length === 0
      ? ''
      : seatColor(game, seats[(Math.max(0, current) + offset + seats.length) % seats.length].index);
  switch (op) {
    case 'get:turn_color':
      return current < 0 ? '' : colorAt(0);
    case 'get:enable':
      return seats.length > 0;
    case 'next':
      return colorAt(1);
    case 'previous':
      return colorAt(-1);
    case 'set:turn_color': {
      const seat = typeof value === 'string' ? seatOfColor(game, value) : undefined;
      if (seat !== undefined) host.emit({ type: 'NEXT_TURN', payload: { seat } });
      return undefined;
    }
    case 'set:enable':
      return undefined;
    default:
      host.unshimmed(`Turns.${op.replace(/^(get|set):/, '')}`);
      return undefined;
  }
}

/** `Notes.getNotes/setNotes/addNotebookTab` on the runtime's notes text. */
export function notesCall(host: LuaShimHost, op: string, value: unknown): LuaValue | undefined {
  switch (op) {
    case 'get':
      return host.meta.notes;
    case 'set':
      host.meta.notes = luaString(value);
      return true;
    case 'add': {
      const tab = asLuaTable(value);
      const title = luaString(tab.title);
      const body = luaString(tab.body);
      host.meta.notes = [host.meta.notes, title, body].filter(Boolean).join('\n');
      return 0;
    }
    default:
      return undefined;
  }
}

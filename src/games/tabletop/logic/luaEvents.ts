/**
 * TTS events from what happens on the table [ID: LOGIC-TABLETOP-LUA-EVENTS]
 *
 * The host's runtime turns applied actions into script events. From the action itself (it
 * knows who sent it, `host.seat`): button presses (`RUN_ROUTINE` on a `lua_rt_` button) and
 * `onObjectPickUp` / `onPickUp` at the first move of a drag. From the table before and after
 * (`diffEvents`): `onObjectEnterContainer` / `onObjectLeaveContainer` (deck cards, bag items,
 * holder children), `onObjectEnterScriptingZone` / `onObjectLeaveScriptingZone` (a widget's
 * centre crossing a `scriptZones` rectangle) and `onPlayerTurn`. `onObjectDrop` / `onDrop`
 * follow a snap, a play from the hand, or `DROP_IDLE_MS` after a drag's last move
 * (`LuaDragTracker`). Changes the scripts made themselves raise no events (no ping-pong).
 */
import type { TabletopAction } from './tabletopReducer';
import type { TabletopGameDefinition } from './types';
import type { LuaValue } from './luaVm';
import { LUA_RUNTIME_BUTTON_PREFIX, objectRef } from './luaShimTypes';
import { centreIn, containerIds } from './luaShimRead';
import { seatColor } from './luaShimPlayers';
import { turnSeatIndex } from './turnOrder';

export type LuaRuntimeEvent =
  | { kind: 'event'; name: string; args: LuaValue[]; owner?: string }
  | { kind: 'turn'; color: string; previous?: string }
  | { kind: 'click'; buttonId: string; color: string };

/** A drag counts as dropped this long after its last move. */
export const DROP_IDLE_MS = 300;
/** TTS colour of a sender without seat. */
export const NO_SEAT_COLOR = 'Grey';

type Game = Pick<TabletopGameDefinition, 'widgets' | 'scripts' | 'scriptZones'>;

/** TTS colour of the action's sender; `viewerSeat` stands in for the host's own actions. */
export function senderColor(action: TabletopAction, game: Game, viewerSeat: number | null) {
  const seat = action.host && action.host.seat !== undefined ? action.host.seat : viewerSeat;
  return seat === null ? NO_SEAT_COLOR : seatColor(game, seat);
}

const pickUp = (color: string, id: string): LuaRuntimeEvent[] => [
  { kind: 'event', name: 'onObjectPickUp', args: [color, objectRef(id)] },
  { kind: 'event', name: 'onPickUp', args: [color], owner: id },
];

export const dropEvents = (color: string, id: string): LuaRuntimeEvent[] => [
  { kind: 'event', name: 'onObjectDrop', args: [color, objectRef(id)] },
  { kind: 'event', name: 'onDrop', args: [color], owner: id },
];

/** Remembers drags so a pick-up fires once per gesture and a drop after the last move. */
export class LuaDragTracker {
  private gestures = new Map<string, string>();
  private pending = new Map<string, { color: string; at: number }>();

  /** True at the first move of a gesture for this widget. */
  move(id: string, gesture: string, color: string, now: number): boolean {
    const first = this.gestures.get(id) !== gesture;
    this.gestures.set(id, gesture);
    this.pending.set(id, { color, at: now });
    return first;
  }

  /** The drag ended explicitly (snap): no idle drop for it. */
  settle(id: string): void {
    this.pending.delete(id);
  }

  /** Drop events for drags idle since `DROP_IDLE_MS`. */
  due(now: number): LuaRuntimeEvent[] {
    const out: LuaRuntimeEvent[] = [];
    for (const [id, { color, at }] of this.pending) {
      if (now - at < DROP_IDLE_MS) continue;
      this.pending.delete(id);
      out.push(...dropEvents(color, id));
    }
    return out;
  }
}

/** Events an action causes by itself (before it is applied). */
export function actionEvents(
  action: TabletopAction,
  game: Game,
  color: string,
  drags: LuaDragTracker,
  now: number,
): LuaRuntimeEvent[] {
  switch (action.type) {
    case 'RUN_ROUTINE':
      return action.payload.buttonId.startsWith(LUA_RUNTIME_BUTTON_PREFIX)
        ? [{ kind: 'click', buttonId: action.payload.buttonId, color }]
        : [];
    case 'MOVE_WIDGET': {
      const { id, gesture } = action.payload;
      if (!game.widgets[id]) return [];
      if (!gesture) return [...pickUp(color, id), ...dropEvents(color, id)];
      return drags.move(id, gesture, color, now) ? pickUp(color, id) : [];
    }
    case 'SNAP_TO_HOLDER':
      drags.settle(action.payload.widgetId);
      return dropEvents(color, action.payload.widgetId);
    case 'PLAY_CARD_FROM_HAND':
      return [...pickUp(color, action.payload.cardId), ...dropEvents(color, action.payload.cardId)];
    default:
      return [];
  }
}

function containerEvents(prev: Game, next: Game): LuaRuntimeEvent[] {
  const out: LuaRuntimeEvent[] = [];
  for (const [id, w] of Object.entries(next.widgets)) {
    const before = prev.widgets[id];
    if (before === w) continue;
    const was = new Set((before && containerIds(before)) ?? []);
    const now = containerIds(w) ?? [];
    const nowSet = new Set(now);
    for (const item of now) {
      if (!was.has(item)) {
        out.push({
          kind: 'event',
          name: 'onObjectEnterContainer',
          args: [objectRef(id), objectRef(item)],
        });
      }
    }
    for (const item of was) {
      if (!nowSet.has(item)) {
        out.push({
          kind: 'event',
          name: 'onObjectLeaveContainer',
          args: [objectRef(id), objectRef(item)],
        });
      }
    }
  }
  return out;
}

function zoneEvents(prev: Game, next: Game): LuaRuntimeEvent[] {
  const zones = Object.values(next.scriptZones ?? {});
  if (zones.length === 0) return [];
  const out: LuaRuntimeEvent[] = [];
  for (const [id, w] of Object.entries(next.widgets)) {
    const before = prev.widgets[id];
    if (before === w || w.type === 'button') continue;
    for (const zone of zones) {
      const was = Boolean(before) && centreIn(before, zone);
      const is = centreIn(w, zone);
      if (was === is) continue;
      const name = is ? 'onObjectEnterScriptingZone' : 'onObjectLeaveScriptingZone';
      out.push({ kind: 'event', name, args: [objectRef(zone.id), objectRef(id)] });
    }
  }
  return out;
}

/** Events read from the table before and after a batch of applied actions. */
export function diffEvents(prev: Game, next: Game): LuaRuntimeEvent[] {
  if (prev.widgets === next.widgets) return [];
  const out = [...containerEvents(prev, next), ...zoneEvents(prev, next)];
  const before = turnSeatIndex(prev.widgets);
  const after = turnSeatIndex(next.widgets);
  if (after !== undefined && after !== before) {
    out.push({
      kind: 'turn',
      color: seatColor(next, after),
      ...(before !== undefined ? { previous: seatColor(prev, before) } : {}),
    });
  }
  return out;
}

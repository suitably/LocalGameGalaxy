/**
 * TTS API shim v1, host side [ID: LOGIC-TABLETOP-LUA-SHIM]
 *
 * The single host function the Lua prelude calls (`host(op, …)`): object lookups, reads,
 * mutations (one reducer action each, `luaShimWrite.ts`), buttons, players/turns/notes, printing
 * and JSON. It only sees plain values (`LuaValue`) and a `LuaShimHost`, so tests drive it
 * without a VM. Calls it does not know are reported (`unshimmed`), never thrown.
 */
import type { LuaHostFunction, LuaValue } from './luaVm';
import { luaString, toLuaValue } from './luaVm';
import { projectionOf } from './luaProjection';
import { readObject, readZone } from './luaShimRead';
import { writeObject } from './luaShimWrite';
import { buttonCall } from './luaShimButtons';
import {
  notesCall,
  playerCall,
  seatColor,
  seatedColors,
  tableSeats,
  turnsCall,
} from './luaShimPlayers';
import { objectRef, type LuaObjectCall, type LuaShimHost } from './luaShimTypes';

/** Object methods answered by the host; the rest are Lua-side or reported as unshimmed. */
export const LUA_HOST_METHODS = [
  'getPosition',
  'setPosition',
  'setPositionSmooth',
  'getRotation',
  'setRotation',
  'setRotationSmooth',
  'flip',
  'shuffle',
  'randomize',
  'roll',
  'deal',
  'dealToColor',
  'takeObject',
  'putObject',
  'getObjects',
  'getQuantity',
  'getName',
  'setName',
  'getDescription',
  'setDescription',
  'getGMNotes',
  'setGMNotes',
  'getTags',
  'hasTag',
  'getStateId',
  'setState',
  'getLock',
  'setLock',
  'getValue',
  'setValue',
  'createButton',
  'editButton',
  'removeButton',
  'clearButtons',
  'getButtons',
];

/** Largest JSON text `JSON.decode` accepts. */
export const MAX_LUA_JSON = 1_000_000;

function objectCall(host: LuaShimHost, guid: string, method: string, args: unknown[]) {
  const game = host.game();
  const projection = projectionOf(game);
  const zone = game.scriptZones?.[guid];
  const widget = game.widgets[guid];
  if (!widget && zone) {
    const r = readZone(game, zone, method, projection);
    if (r === null) host.unshimmed(`Zone.${method.replace(/^field:/, '')}`);
    return r ?? undefined;
  }
  if (!widget) return undefined;
  const call: LuaObjectCall = { host, guid, widget, projection };
  for (const handler of [readObject, writeObject, buttonCall]) {
    const r = handler(call, method, args);
    if (r !== null) return r;
  }
  host.unshimmed(`Object.${method.replace(/^field:/, '')}`);
  return undefined;
}

function jsonDecode(text: unknown): LuaValue | undefined {
  const s = luaString(text);
  if (s.length > MAX_LUA_JSON) return undefined;
  try {
    return toLuaValue(JSON.parse(s));
  } catch {
    return undefined;
  }
}

/** The host function for one session. */
export function createLuaShim(host: LuaShimHost): LuaHostFunction {
  const dispatch = (op: string, args: unknown[]): unknown => {
    const game = host.game();
    switch (op) {
      case 'exists':
        return (
          typeof args[0] === 'string' &&
          Boolean(game.widgets[args[0]] ?? game.scriptZones?.[args[0]])
        );
      case 'all':
        return Object.keys(game.widgets).map(objectRef);
      case 'tagged': {
        const tag = luaString(args[0]);
        return Object.entries(game.scripts?.objects ?? {})
          .filter(([guid, e]) => e.tags?.includes(tag) && game.widgets[guid])
          .map(([guid]) => objectRef(guid));
      }
      case 'seated':
        return seatedColors(game);
      case 'colors':
        return tableSeats(game.widgets).map((s) => seatColor(game, s.index));
      case 'obj':
        return objectCall(host, luaString(args[0]), luaString(args[1]), args.slice(2));
      case 'player':
        return playerCall(host, luaString(args[0]), luaString(args[1]), args.slice(2));
      case 'turns':
        return turnsCall(host, luaString(args[0]), args[1]);
      case 'notes':
        return notesCall(host, luaString(args[0]), args[1]);
      case 'print':
        host.print(
          luaString(args[0]),
          typeof args[1] === 'string' ? args[1] : undefined,
          luaString(args[2], 'all'),
        );
        return undefined;
      case 'json_encode':
        return JSON.stringify(args[0] ?? null, null, args[1] === true ? 2 : undefined);
      case 'json_decode':
        return jsonDecode(args[0]);
      case 'unshimmed':
        host.unshimmed(luaString(args[0]));
        return undefined;
      case 'error':
        host.print(luaString(args[0]), undefined, 'error');
        return undefined;
      default:
        host.unshimmed(`host:${op}`);
        return undefined;
    }
  };
  return (op, ...args) => toLuaValue(dispatch(luaString(op), args));
}

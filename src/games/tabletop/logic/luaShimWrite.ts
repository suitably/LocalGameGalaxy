/**
 * Lua shim: object mutations as reducer actions [ID: LOGIC-TABLETOP-LUA-SHIM-WRITE]
 *
 * ADR-0005: a script never writes the table directly. Every TTS mutation becomes one existing
 * reducer action (`MOVE_WIDGET`, `FLIP_CARD`, `SHUFFLE_DECK`, `DRAW_CARD`, `DRAW_FROM_BAG`,
 * `RETURN_CARD_TO_DECK`, `SNAP_TO_HOLDER`, `SET_STATE`, `ROLL_DIE`, `PATCH_WIDGETS`, …) that the
 * session emits as the script's intent; random results (shuffle order, die value, spawned id)
 * are filled in on the host by `prepareHostAction` and travel in the delta.
 */
import type { TabletopAction } from './tabletopReducer';
import type { DeckWidget, TabletopWidget } from './types';
import type { LuaValue } from './luaVm';
import { asLuaTable, luaNumber, luaString } from './luaVm';
import { readVector, rotationFromTts, widgetRotation, worldToTopLeft } from './luaProjection';
import { objectRef, type LuaObjectCall } from './luaShimTypes';
import { dealActions } from './dealCards';
import { handOfColor } from './luaShimPlayers';

/** Most cards one `deal` call moves. */
export const MAX_LUA_DEAL = 200;

/** A `{__obj = guid}` argument (an object proxy passed back from Lua). */
export const refGuid = (v: unknown): string | undefined => {
  const guid = asLuaTable(v).__obj;
  return typeof guid === 'string' ? guid : undefined;
};

function moveTo(call: LuaObjectCall, pos: unknown): void {
  const { widget: w, projection } = call;
  const v = readVector(pos);
  if (v.x === undefined || v.z === undefined) return;
  const at = worldToTopLeft({ x: v.x, z: v.z }, w, projection);
  call.host.emit({ type: 'MOVE_WIDGET', payload: { id: w.id, ...at } });
}

function rotateTo(call: LuaObjectCall, rot: unknown): void {
  const { widget: w, host } = call;
  const v = readVector(rot);
  if (v.y !== undefined) {
    const angle = rotationFromTts(v.y);
    if (w.type === 'card') host.emit({ type: 'ROTATE_CARD', payload: { cardId: w.id, angle } });
    else {
      const current = rotationFromTts(widgetRotation(w).y);
      if (angle !== current) {
        host.emit({
          type: 'ROTATE_WIDGETS',
          payload: { ids: [w.id], deltaDegrees: angle - current },
        });
      }
    }
  }
  if (v.z !== undefined && w.type === 'card') {
    const faceDown = Math.abs((((v.z % 360) + 360) % 360) - 180) < 90;
    if (faceDown === w.faceUp) host.emit({ type: 'FLIP_CARD', payload: { cardId: w.id } });
  }
}

function deal(call: LuaObjectCall, count: unknown, color: unknown): LuaValue | undefined {
  const { widget: w, host } = call;
  if (w.type !== 'deck') return undefined;
  const n = Math.max(0, Math.min(MAX_LUA_DEAL, Math.floor(luaNumber(count, 1))));
  const hand = typeof color === 'string' ? handOfColor(host.game(), color) : undefined;
  if (typeof color === 'string' && !hand) return undefined;
  const actions: TabletopAction[] = hand
    ? Array.from({ length: n }, () => ({
        type: 'DRAW_CARD' as const,
        payload: { deckId: w.id, targetHolderId: hand },
      }))
    : dealActions(host.game().widgets, w.id, n);
  for (const action of actions) host.emit(action);
  return undefined;
}

/** `takeObject{position, index, guid, flip}` from a deck or bag; returns the taken object. */
function takeObject(call: LuaObjectCall, params: unknown): LuaValue | undefined {
  const { widget: w, host, projection } = call;
  const p = asLuaTable(params);
  const v = readVector(p.position);
  const place = (size: { width: number; height: number }) =>
    v.x !== undefined && v.z !== undefined
      ? worldToTopLeft({ x: v.x, z: v.z }, size, projection)
      : { x: w.x + w.width + 16, y: w.y };
  if (w.type === 'deck') {
    const deck = w as DeckWidget;
    const top = deck.cardIds.length - 1;
    const index = Math.floor(luaNumber(p.index, 0));
    const cardId =
      typeof p.guid === 'string' && deck.cardIds.includes(p.guid)
        ? p.guid
        : deck.cardIds[top - index];
    const card = cardId ? host.game().widgets[cardId] : undefined;
    if (!card) return undefined;
    const faceUp = p.flip === true ? !deck.faceUp : Boolean(deck.faceUp);
    host.emit({
      type: 'DRAW_CARD',
      payload: { deckId: deck.id, cardId, position: place(card), faceUp },
    });
    return objectRef(cardId);
  }
  if (w.type === 'bag') {
    const drawn = w.isInfinite ? undefined : w.itemIds?.[w.itemIds.length - 1];
    if (!w.isInfinite && !drawn) return undefined;
    const size = (drawn && host.game().widgets[drawn]) || w.templateWidget || w;
    const done = host.emit({
      type: 'DRAW_FROM_BAG',
      payload: { bagId: w.id, position: place(size) },
    });
    const spawned = done.type === 'DRAW_FROM_BAG' ? done.payload.spawnedId : undefined;
    const id = drawn ?? spawned;
    return id ? objectRef(id) : undefined;
  }
  return undefined;
}

/** `container.putObject(obj)`: back into a deck, or into a holder. */
function putObject(call: LuaObjectCall, obj: unknown): LuaValue | undefined {
  const { widget: w, host } = call;
  const guid = refGuid(obj);
  const item = guid ? host.game().widgets[guid] : undefined;
  if (!item) return undefined;
  if (w.type === 'deck' && item.type === 'card') {
    host.emit({ type: 'RETURN_CARD_TO_DECK', payload: { cardId: item.id, deckId: w.id } });
  } else if (w.type === 'holder') {
    host.emit({ type: 'SNAP_TO_HOLDER', payload: { widgetId: item.id, holderId: w.id } });
  } else {
    host.unshimmed(`Object.putObject(${w.type})`);
    return undefined;
  }
  return objectRef(w.id);
}

const patch = (call: LuaObjectCall, changes: Partial<TabletopWidget>) =>
  call.host.emit({ type: 'PATCH_WIDGETS', payload: { patches: { [call.widget.id]: changes } } });

function setMeta(call: LuaObjectCall, key: 'description' | 'gmNotes', value: unknown) {
  const objects = call.host.meta.objects;
  objects[call.guid] = { ...objects[call.guid], [key]: luaString(value) };
}

/**
 * Applies a mutating method; returns `null` when `method` is not one. TTS returns `true` from
 * most setters, so do we.
 */
export function writeObject(
  call: LuaObjectCall,
  method: string,
  args: unknown[],
): LuaValue | null | undefined {
  const { widget: w, host } = call;
  switch (method) {
    case 'setPosition':
    case 'setPositionSmooth':
      moveTo(call, args[0]);
      return true;
    case 'setRotation':
    case 'setRotationSmooth':
      rotateTo(call, args[0]);
      return true;
    case 'flip':
      if (w.type === 'card') host.emit({ type: 'FLIP_CARD', payload: { cardId: w.id } });
      else host.emit({ type: 'FLIP_WIDGETS', payload: { ids: [w.id] } });
      return true;
    case 'shuffle':
    case 'randomize':
      if (w.type === 'deck') host.emit({ type: 'SHUFFLE_DECK', payload: { deckId: w.id } });
      else if (w.type === 'die') host.emit({ type: 'ROLL_DIE', payload: { dieId: w.id } });
      return true;
    case 'roll':
      if (w.type === 'die') host.emit({ type: 'ROLL_DIE', payload: { dieId: w.id } });
      return true;
    case 'deal':
      return deal(call, args[0], args[1]);
    case 'dealToColor':
      return deal(call, args[0], args[1]);
    case 'takeObject':
      return takeObject(call, args[0]);
    case 'putObject':
      return putObject(call, args[0]);
    case 'setName':
      patch(call, { label: luaString(args[0]) });
      return true;
    case 'setDescription':
      setMeta(call, 'description', args[0]);
      return true;
    case 'setGMNotes':
      setMeta(call, 'gmNotes', args[0]);
      return true;
    case 'setState': {
      const index = Math.floor(luaNumber(args[0], 1)) - 1;
      if (w.states && index >= 0 && index < w.states.length) {
        host.emit({ type: 'SET_STATE', payload: { widgetId: w.id, index } });
        return objectRef(w.id);
      }
      return undefined;
    }
    case 'setLock':
      patch(call, { pinned: Boolean(args[0]) });
      return true;
    case 'setValue':
      if (w.type === 'counter') {
        const delta = luaNumber(args[0], w.value) - w.value;
        if (delta) host.emit({ type: 'UPDATE_COUNTER', payload: { counterId: w.id, delta } });
      } else if (w.type === 'die') {
        host.emit({ type: 'ROLL_DIE', payload: { dieId: w.id, value: luaNumber(args[0], 1) } });
      } else patch(call, { label: luaString(args[0]) });
      return true;
    default:
      return null;
  }
}

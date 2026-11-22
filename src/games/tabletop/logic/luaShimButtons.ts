/**
 * Lua shim: script buttons [ID: LOGIC-TABLETOP-LUA-SHIM-BUTTONS]
 *
 * `createButton` adds a `ButtonWidget` (`ADD_WIDGET`) with an empty routine and the id
 * `lua_rt_<guid>_<index>`; the session remembers which script function it calls. A press is an
 * ordinary `RUN_ROUTINE` from any device; the host's runtime sees it and calls the function
 * (`luaEvents.ts`). TTS `position` is local to the object (x → right, z → down on screen).
 */
import type { ButtonWidget } from './types';
import type { LuaValue } from './luaVm';
import { asLuaTable, luaNumber, luaString } from './luaVm';
import { readVector } from './luaProjection';
import { LUA_RUNTIME_BUTTON_PREFIX, type LuaObjectCall } from './luaShimTypes';
import { refGuid } from './luaShimWrite';

/** Buttons one object may carry (TTS has no limit; runaway loops do). */
export const MAX_LUA_BUTTONS_PER_OBJECT = 32;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Button rectangle in table pixels. TTS sizes are about 1/500 of a unit per scale step. */
function rect(call: LuaObjectCall, p: Record<string, unknown>) {
  const { widget: w, projection } = call;
  const width = Math.round(clamp((luaNumber(p.width, 800) * projection.scale) / 500, 64, 280));
  const height = Math.round(clamp((luaNumber(p.height, 300) * projection.scale) / 500, 32, 96));
  const local = readVector(p.position);
  const cx = w.x + w.width / 2 + (local.x ?? 0) * projection.scale;
  const cy = w.y + w.height / 2 + (local.z ?? 0) * projection.scale;
  return { x: Math.round(cx - width / 2), y: Math.round(cy - height / 2), width, height };
}

const ownButtons = (call: LuaObjectCall) =>
  Object.entries(call.host.meta.buttons)
    .filter(([id, ref]) => ref.target === call.guid && call.host.game().widgets[id])
    .sort(([, a], [, b]) => a.index - b.index);

function visual(p: Record<string, unknown>): Partial<ButtonWidget> {
  const text = luaString(p.label) || luaString(p.tooltip);
  const color = typeof p.color === 'string' ? p.color : undefined;
  return { text, ...(color ? { color } : {}) };
}

function create(call: LuaObjectCall, params: unknown): LuaValue | undefined {
  const { host, guid, widget: w } = call;
  const p = asLuaTable(params);
  const mine = ownButtons(call);
  if (mine.length >= MAX_LUA_BUTTONS_PER_OBJECT) return undefined;
  const index = mine.length === 0 ? 0 : mine[mine.length - 1][1].index + 1;
  const id = `${LUA_RUNTIME_BUTTON_PREFIX}${guid}_${index}`;
  const owner = refGuid(p.function_owner) ?? '-1';
  host.meta.buttons[id] = { target: guid, owner, fn: luaString(p.click_function), index };
  const button: ButtonWidget = {
    id,
    type: 'button',
    ...rect(call, p),
    zIndex: w.zIndex + 1,
    text: '',
    ...visual(p),
    pinned: true,
    movable: false,
    routine: [],
  };
  host.emit({ type: 'ADD_WIDGET', payload: { widget: button } });
  return index;
}

function remove(call: LuaObjectCall, ids: string[]) {
  if (ids.length === 0) return;
  for (const id of ids) delete call.host.meta.buttons[id];
  call.host.emit({ type: 'DELETE_WIDGETS', payload: { ids } });
}

/** Button method result, or `null` when `method` is not a button method. */
export function buttonCall(
  call: LuaObjectCall,
  method: string,
  args: unknown[],
): LuaValue | null | undefined {
  switch (method) {
    case 'createButton':
      return create(call, args[0]);
    case 'editButton': {
      const p = asLuaTable(args[0]);
      const entry = ownButtons(call).find(([, ref]) => ref.index === luaNumber(p.index, 0));
      if (!entry) return false;
      const [id, ref] = entry;
      if (typeof p.click_function === 'string') ref.fn = p.click_function;
      const changes = { ...visual(p), ...(p.width || p.height || p.position ? rect(call, p) : {}) };
      if (!changes.text) delete changes.text;
      call.host.emit({ type: 'PATCH_WIDGETS', payload: { patches: { [id]: changes } } });
      return true;
    }
    case 'removeButton': {
      const entry = ownButtons(call).find(([, ref]) => ref.index === luaNumber(args[0], -1));
      remove(call, entry ? [entry[0]] : []);
      return Boolean(entry);
    }
    case 'clearButtons':
      remove(
        call,
        ownButtons(call).map(([id]) => id),
      );
      return true;
    case 'getButtons':
      return ownButtons(call).map(([id, ref]) => {
        const b = call.host.game().widgets[id];
        return {
          index: ref.index,
          click_function: ref.fn,
          label: b?.type === 'button' ? b.text : '',
        };
      });
    default:
      return null;
  }
}

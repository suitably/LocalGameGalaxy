/**
 * TTS Lua object methods → routine steps [ID: LOGIC-TABLETOP-LUA-IDIOMS]
 *
 * The straight-line idioms of TTS plan slice 8: `shuffle`, `deal`, `dealToColor`, `takeObject`,
 * `putObject`, `flip`, `setState`, `setName`. Each maps only when its target widget and
 * arguments are statically known and the routine engine has a matching op; otherwise the
 * reason (the method name) is returned and the whole click function stays untranslated.
 */
import type { RoutineStep, WidgetType } from './types';
import { MAX_DRAW_COUNT } from './routines';
import { numOf, strOf, type LuaValue } from './luaValues';

/** A converted table object the translator may address, by TTS GUID. */
export interface LuaTarget {
  /** Widget id on the table (decks get generated ids, repeats `guid~2`). */
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  /** TTS `Transform` scale, for button offsets and sizes. */
  scaleX: number;
  scaleZ: number;
  /** TTS state numbers in the order of the widget's `states` (current state first). */
  states?: number[];
}

export interface LuaTranslateContext {
  targets: Record<string, LuaTarget>;
  /** TTS player colour → hand holder id. */
  hands: Record<string, string>;
  /** Pixels per TTS unit (the importer's projection scale). */
  scale: number;
}

/** Methods this module translates; `broadcastToAll` (chat only) is dropped without a step. */
export const TRANSLATED_METHODS = new Set([
  'shuffle',
  'deal',
  'dealToColor',
  'takeObject',
  'putObject',
  'flip',
  'setState',
  'setName',
]);

/** `takeObject` parameters that do not change which piece moves or where it ends up. */
const TAKE_KEYS_IGNORED = new Set(['position', 'rotation', 'smooth', 'top']);

const countOf = (v: LuaValue | undefined): number | undefined => {
  const n = v ? numOf(v) : undefined;
  return n !== undefined && Number.isInteger(n) && n >= 1 && n <= MAX_DRAW_COUNT ? n : undefined;
};

function dealSteps(
  target: LuaTarget,
  count: LuaValue | undefined,
  color: LuaValue | undefined,
  ctx: LuaTranslateContext,
): RoutineStep[] | null {
  const n = countOf(count);
  if (target.type !== 'deck' || n === undefined) return null;
  if (!color) return [{ op: 'DEAL', deck: target.id, count: n }];
  const hand = strOf(color) ? ctx.hands[strOf(color) as string] : undefined;
  return hand ? [{ op: 'DRAW', deck: target.id, count: n, to: hand }] : null;
}

function takeSteps(target: LuaTarget, params: LuaValue | undefined): RoutineStep[] | null {
  if (params && params.k !== 'table') return null;
  if (params?.k === 'table') {
    for (const [key, value] of params.fields) {
      if (key === 'flip' && value.k === 'bool' && !value.v) continue;
      if (!TAKE_KEYS_IGNORED.has(key)) return null;
    }
  }
  if (target.type === 'deck') return [{ op: 'DRAW', deck: target.id, count: 1 }];
  if (target.type === 'bag') return [{ op: 'TAKE_FROM_BAG', bag: target.id, count: 1 }];
  return null;
}

function stateIndex(target: LuaTarget, value: LuaValue | undefined): number | undefined {
  const n = value ? numOf(value) : undefined;
  const index = n === undefined ? -1 : (target.states?.indexOf(n) ?? -1);
  return index >= 0 ? index : undefined;
}

/** Steps for `target.method(args)`, or null when this call cannot be translated. */
export function idiomSteps(
  method: string,
  target: LuaTarget | undefined,
  args: LuaValue[],
  ctx: LuaTranslateContext,
): RoutineStep[] | null {
  if (!target) return null;
  switch (method) {
    case 'shuffle':
      return target.type === 'deck' && args.length === 0
        ? [{ op: 'SHUFFLE', deck: target.id }]
        : null;
    case 'deal':
      return args.length <= 2 ? dealSteps(target, args[0], args[1], ctx) : null;
    case 'dealToColor':
      return args.length === 2 ? dealSteps(target, args[0], args[1], ctx) : null;
    case 'takeObject':
      return args.length <= 1 ? takeSteps(target, args[0]) : null;
    case 'putObject': {
      const piece = args[0]?.k === 'obj' ? ctx.targets[args[0].guid] : undefined;
      if (!piece || (target.type !== 'deck' && target.type !== 'holder')) return null;
      if (target.type === 'deck' && piece.type !== 'card') return null;
      return [{ op: 'PLACE_IN_HOLDER', widget: piece.id, holder: target.id }];
    }
    case 'flip':
      return target.type === 'card' && args.length === 0
        ? [{ op: 'FLIP', cards: [target.id] }]
        : null;
    case 'setState': {
      const state = stateIndex(target, args[0]);
      return state === undefined ? null : [{ op: 'SET_STATE', widget: target.id, state }];
    }
    case 'setName': {
      const label = args[0] ? strOf(args[0]) : undefined;
      return label === undefined ? null : [{ op: 'SET', widget: target.id, props: { label } }];
    }
    default:
      return null;
  }
}

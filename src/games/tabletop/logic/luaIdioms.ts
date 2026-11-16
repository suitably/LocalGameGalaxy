/**
 * TTS Lua object methods → routine steps [ID: LOGIC-TABLETOP-LUA-IDIOMS]
 *
 * The idioms of TTS plan slice 8: `shuffle`, `deal`, `dealToColor`, `takeObject` (also to a
 * world `position`), `putObject`, `flip`, `setState`, `setName`, `setPosition(Smooth)`. Each maps
 * only when its target widget and
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
  /** Decks: whether the cards lie face up in it. */
  faceUp?: boolean;
}

export interface LuaTranslateContext {
  targets: Record<string, LuaTarget>;
  /** TTS player colour → hand holder id. */
  hands: Record<string, string>;
  /** Pixels per TTS unit (the importer's projection scale). */
  scale: number;
  /** TTS world `x`/`z` → table pixels; without it positions in scripts are not translated. */
  project?: (x: number, z: number) => { x: number; y: number };
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
  'setPosition',
  'setPositionSmooth',
]);

/**
 * `takeObject` parameters that pick a certain piece or run more code; with one of them the call
 * is not translated. TTS ignores every other key, so scripts pass their own data along.
 */
const TAKE_KEYS_UNSUPPORTED = new Set([
  'index',
  'guid',
  'callback',
  'callback_function',
  'callback_owner',
  'params',
]);

/**
 * A TTS vector (`{x, y, z}` or `{x=…, y=…, z=…}`) as a table point: where the importer puts the
 * top-left corner of a piece at that world position.
 */
function pointOf(v: LuaValue | undefined, ctx: LuaTranslateContext) {
  if (v?.k !== 'table' || !ctx.project) return undefined;
  const axis = (name: string, index: string) =>
    numOf(v.fields.get(name) ?? v.fields.get(index) ?? { k: 'unknown' });
  const [x, z] = [axis('x', '1'), axis('z', '3')];
  return x === undefined || z === undefined ? undefined : ctx.project(x, z);
}

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

function takeSteps(
  target: LuaTarget,
  params: LuaValue | undefined,
  ctx: LuaTranslateContext,
): RoutineStep[] | null {
  if (params && params.k !== 'table') return null;
  const fields = params?.fields ?? new Map<string, LuaValue>();
  if ([...fields.keys()].some((key) => TAKE_KEYS_UNSUPPORTED.has(key))) return null;
  const flip = fields.get('flip') ?? { k: 'bool', v: false };
  const position = fields.get('position');
  const at = pointOf(position, ctx);
  // A position the importer cannot place, or a flip without one, would be guessed.
  if (flip.k !== 'bool' || (position && ctx.project && !at) || (flip.v && !at)) return null;
  if (target.type === 'deck') {
    // TTS turns the card over relative to how it lies in the deck.
    const faceUp = Boolean(target.faceUp) !== flip.v;
    return [{ op: 'DRAW', deck: target.id, count: 1, ...(at ? { at, faceUp } : {}) }];
  }
  if (target.type === 'bag' && !flip.v) {
    return [{ op: 'TAKE_FROM_BAG', bag: target.id, count: 1, ...(at ? { at } : {}) }];
  }
  return null;
}

function moveSteps(target: LuaTarget, to: LuaValue | undefined, ctx: LuaTranslateContext) {
  const at = pointOf(to, ctx);
  return at ? [{ op: 'MOVE' as const, widget: target.id, x: at.x, y: at.y }] : null;
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
      return (target.type === 'deck' || target.type === 'bag') && args.length === 0
        ? [{ op: 'SHUFFLE', deck: target.id }]
        : null;
    case 'deal':
      return args.length <= 2 ? dealSteps(target, args[0], args[1], ctx) : null;
    case 'dealToColor':
      return args.length === 2 ? dealSteps(target, args[0], args[1], ctx) : null;
    case 'takeObject':
      return args.length <= 1 ? takeSteps(target, args[0], ctx) : null;
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
    case 'setPosition':
    case 'setPositionSmooth':
      return moveSteps(target, args[0], ctx);
    case 'setName': {
      const label = args[0] ? strOf(args[0]) : undefined;
      return label === undefined ? null : [{ op: 'SET', widget: target.id, props: { label } }];
    }
    default:
      return null;
  }
}

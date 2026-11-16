/**
 * Static TTS Lua → routine translator [ID: LOGIC-TABLETOP-LUA-TRANSLATOR]
 *
 * TTS plan slice 8, ADR-0005 decision 2: reads the verbatim `scripts` sidecar with `luaparse`,
 * never runs it. Every `createButton{click_function}` becomes a `ButtonWidget` on its object;
 * when the click function is code over the idioms in `luaIdioms.ts` whose branches and loops
 * resolve statically (`luaControl.ts`) it gets the routine, otherwise it stays visible but inert (`untranslated`) and is listed in the report
 * together with event handlers and scripts that do not parse.
 */
import type {
  AssignmentStatement,
  Chunk,
  FunctionDeclaration,
  Identifier,
  LocalStatement,
  LuaNode,
} from 'luaparse';
import type { ButtonWidget, GameScripts, RoutineStep } from './types';
import type { UntranslatedScriptFunction } from './importTypes';
import type { LuaTarget, LuaTranslateContext } from './luaIdioms';
import { MAX_ROUTINE_STEPS, parseRoutine } from './routines';
import { evalLua, fieldOf, LuaScope, numOf, parseLua, strOf, UNKNOWN } from './luaValues';
import type { LuaValue } from './luaValues';
import { findCreateButtonCalls, LuaBodyWalker } from './luaWalker';
import type { LuaScriptInfo, RawLuaButton } from './luaWalker';

export type { LuaTarget, LuaTranslateContext } from './luaIdioms';

export interface LuaTranslation {
  buttons: ButtonWidget[];
  /** Setup buttons found and how many got a routine (the harness coverage metric). */
  coverage: { total: number; translated: number };
  untranslated: UntranslatedScriptFunction[];
}

/** Report entries kept per game (the list is for people, not a full dump). */
export const MAX_UNTRANSLATED_ENTRIES = 200;
const EVENT_NAME = /^(on|try|filter)[A-Z]/;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Top-level functions: `function f()`, `local function f()`, `f = function() … end`. */
function collectFunctions(chunk: Chunk): Map<string, FunctionDeclaration> {
  const functions = new Map<string, FunctionDeclaration>();
  for (const node of chunk.body) {
    if (node.type === 'FunctionDeclaration') {
      const fn = node as FunctionDeclaration;
      if (fn.identifier?.type === 'Identifier') {
        functions.set((fn.identifier as Identifier).name, fn);
      }
    } else if (node.type === 'LocalStatement' || node.type === 'AssignmentStatement') {
      const s = node as LocalStatement | AssignmentStatement;
      s.variables.forEach((v: LuaNode, i: number) => {
        if (v.type === 'Identifier' && s.init[i]?.type === 'FunctionDeclaration') {
          functions.set((v as Identifier).name, s.init[i] as FunctionDeclaration);
        }
      });
    }
  }
  return functions;
}

const isFunctionDef = (node: LuaNode) =>
  node.type === 'FunctionDeclaration' ||
  ((node.type === 'LocalStatement' || node.type === 'AssignmentStatement') &&
    (node as LocalStatement).init.some((i) => i.type === 'FunctionDeclaration'));

interface ScriptPass {
  info: LuaScriptInfo;
  onLoadConsumed: boolean;
}

/** Parses one script, binds its top level, walks `onLoad` and collects its buttons. */
function setupScript(
  key: string,
  source: string,
  selfGuid: string | undefined,
  ctx: LuaTranslateContext,
  buttons: RawLuaButton[],
  /** Top level of the Global script, for `Global.getTable/getVar`; absent for Global itself. */
  globalScope: LuaScope | undefined,
): ScriptPass | null {
  const chunk = parseLua(source);
  if (!chunk) return null;
  const scope = new LuaScope();
  const global: LuaValue = { k: 'global', scope: globalScope ?? scope };
  scope.declare('Global', global);
  scope.declare('self', selfGuid ? { k: 'obj', guid: selfGuid } : global);
  const info: LuaScriptInfo = { key, chunk, scope, functions: collectFunctions(chunk) };
  const walked = new Set<LuaNode>();
  new LuaBodyWalker(info, 'setup', ctx, buttons, walked).run(
    chunk.body.filter((n) => !isFunctionDef(n)),
    scope,
  );
  const onLoad = info.functions.get('onLoad') ?? info.functions.get('onload');
  const load = new LuaBodyWalker(info, 'setup', ctx, buttons, walked);
  if (onLoad) load.run(onLoad.body, new LuaScope(scope));
  // A `createButton` the walker could not follow (loop, branch, other event) is still a button.
  for (const call of findCreateButtonCalls(chunk)) {
    if (walked.has(call.callee)) continue;
    buttons.push({
      script: info,
      owner: call.receiver ? evalLua(call.receiver, scope) : UNKNOWN,
      params: call.args[0] ? evalLua(call.args[0], scope) : UNKNOWN,
      dynamic: true,
    });
  }
  return { info, onLoadConsumed: load.consumed };
}

type ClickResult = { steps: RoutineStep[] } | { reason: string };

/** Routine of one click function, with its first parameter bound to the button's object. */
function translateClick(
  script: LuaScriptInfo,
  fn: FunctionDeclaration,
  owner: LuaValue,
  ctx: LuaTranslateContext,
): ClickResult {
  const press = () => {
    const scope = new LuaScope(script.scope);
    fn.parameters.forEach((p, i) => {
      if (p.type === 'Identifier') scope.declare((p as Identifier).name, i === 0 ? owner : UNKNOWN);
    });
    const walker = new LuaBodyWalker(script, 'click', ctx);
    walker.run(fn.body, scope);
    return walker;
  };
  // The script's variables as they are after loading; a press may change them (`Done = true`).
  const loaded = script.scope.snapshot();
  const first = press();
  const second = first.failure ? first : press();
  script.scope.restore(loaded);
  if (first.failure) return { reason: first.failure };
  if (first.steps.length > MAX_ROUTINE_STEPS) return { reason: 'too_many_steps' };
  // A routine keeps no script variables. A second press that does nothing (a "set up once"
  // guard) or the same again is fine; one that does something else (a toggle) is not.
  const again = JSON.stringify(second.steps);
  if (second.failure || (second.steps.length > 0 && again !== JSON.stringify(first.steps))) {
    return { reason: 'stateful' };
  }
  const parsed = parseRoutine(first.steps);
  return parsed.ok ? { steps: parsed.routine } : { reason: 'invalid_routine' };
}

/** Button rectangle: TTS `position` is local to the object (x → right, z → down on the table). */
function buttonRect(target: LuaTarget, params: LuaValue, scale: number) {
  const pos = fieldOf(params, 'position');
  const local = (axis: string, index: string) =>
    numOf(fieldOf(pos, axis)) ?? numOf(fieldOf(pos, index)) ?? 0;
  const size = (key: string, fallback: number, s: number) =>
    ((numOf(fieldOf(params, key)) ?? fallback) * s * scale) / 500;
  const width = Math.round(clamp(size('width', 800, target.scaleX), 64, 280));
  const height = Math.round(clamp(size('height', 300, target.scaleZ), 32, 96));
  const cx = target.x + target.width / 2 + local('x', '1') * target.scaleX * scale;
  const cy = target.y + target.height / 2 + local('z', '3') * target.scaleZ * scale;
  return { x: Math.round(cx - width / 2), y: Math.round(cy - height / 2), width, height };
}

/** The script that holds a button's click function (`function_owner`, TTS default Global). */
function clickScript(
  button: RawLuaButton,
  passes: Map<string, ScriptPass>,
  fnName: string,
): LuaScriptInfo | undefined {
  const owner = fieldOf(button.params, 'function_owner');
  if (owner.k === 'obj') return passes.get(owner.guid)?.info;
  const global = passes.get('global')?.info;
  if (owner.k === 'global') return global;
  return global?.functions.has(fnName) ? global : button.script;
}

/**
 * Translates the script sidecar of an imported TTS game. `ctx.targets` holds the converted
 * top-level objects by GUID; buttons on objects that are not on the table are counted but not
 * placed.
 */
export function translateTtsScripts(
  scripts: GameScripts | undefined,
  ctx: LuaTranslateContext,
): LuaTranslation {
  const result: LuaTranslation = {
    buttons: [],
    coverage: { total: 0, translated: 0 },
    untranslated: [],
  };
  if (!scripts) return result;
  const listed = new Set<string>();
  const list = (owner: string, fn: string, reason: string) => {
    const id = `${owner}\u0000${fn}`;
    if (listed.has(id) || result.untranslated.length >= MAX_UNTRANSLATED_ENTRIES) return;
    listed.add(id);
    result.untranslated.push({ owner, fn, reason });
  };

  const raw: RawLuaButton[] = [];
  const passes = new Map<string, ScriptPass>();
  const sources: [string, string | undefined, string | undefined][] = [
    ['global', scripts.global?.lua, undefined],
    ...Object.entries(scripts.objects).map(
      ([key, e]): [string, string | undefined, string | undefined] => [key, e.lua, key],
    ),
  ];
  for (const [key, source, selfGuid] of sources) {
    if (!source?.trim()) continue;
    const globalScope = passes.get('global')?.info.scope;
    const pass = setupScript(key, source, selfGuid, ctx, raw, globalScope);
    if (pass) passes.set(key, pass);
    else list(key, '*', 'parse_error');
  }

  const cache = new Map<string, ClickResult>();
  const perOwner = new Map<string, number>();
  for (const button of raw) {
    result.coverage.total += 1;
    const fnName = strOf(fieldOf(button.params, 'click_function'));
    const target = button.owner.k === 'obj' ? ctx.targets[button.owner.guid] : undefined;
    const script = fnName ? clickScript(button, passes, fnName) : undefined;
    const fn = fnName ? script?.functions.get(fnName) : undefined;
    let outcome: ClickResult;
    if (button.dynamic) outcome = { reason: 'dynamic' };
    else if (!fnName) outcome = { reason: 'click_function' };
    else if (!script || !fn) outcome = { reason: 'missing' };
    else {
      const id = `${script.key}\u0000${fnName}\u0000${button.owner.k === 'obj' ? button.owner.guid : ''}`;
      outcome = cache.get(id) ?? translateClick(script, fn, button.owner, ctx);
      cache.set(id, outcome);
    }
    if ('reason' in outcome) list(script?.key ?? button.script.key, fnName ?? '?', outcome.reason);
    if (!target) {
      if ('steps' in outcome) list(button.script.key, fnName ?? '?', 'no_owner');
      continue;
    }
    if ('steps' in outcome) result.coverage.translated += 1;
    const n = (perOwner.get(target.id) ?? 0) + 1;
    perOwner.set(target.id, n);
    const label = strOf(fieldOf(button.params, 'label')) ?? '';
    result.buttons.push({
      id: `lua_btn_${target.id}_${n}`,
      type: 'button',
      ...buttonRect(target, button.params, ctx.scale),
      zIndex: target.zIndex + 1,
      text: label || strOf(fieldOf(button.params, 'tooltip')) || '',
      pinned: true,
      movable: false,
      routine: 'steps' in outcome ? outcome.steps : [],
      ...('steps' in outcome ? {} : { untranslated: fnName ?? '?' }),
    });
  }

  for (const { info, onLoadConsumed } of passes.values()) {
    for (const name of info.functions.keys()) {
      const isLoad = name === 'onLoad' || name === 'onload';
      if (!(EVENT_NAME.test(name) || isLoad) || (isLoad && onLoadConsumed)) continue;
      list(info.key, name, 'event');
    }
  }
  return result;
}

/**
 * Statement walker of the TTS Lua translator [ID: LOGIC-TABLETOP-LUA-WALKER]
 *
 * Walks a function body without running it. In `setup` mode (script top level and `onLoad`) it
 * records variable bindings and `createButton` calls; in `click` mode (a button's click
 * function) it turns every statement into routine steps and stops at the first one it cannot
 * translate, so a routine never runs half a script. Helpers of the same script are inlined
 * (depth-limited, no recursion), as are `startLuaCoroutine` and `Wait.frames/time` callbacks;
 * conditions and loops are followed only where `luaControl.ts` can resolve them statically.
 */
import type {
  AssignmentStatement,
  BlockStatement,
  CallStatement,
  Chunk,
  ForGenericStatement,
  ForNumericStatement,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  LocalStatement,
  LuaNode,
  MemberExpression,
  ReturnStatement,
} from 'luaparse';
import type { RoutineStep } from './types';
import { idiomSteps, TRANSLATED_METHODS, type LuaTranslateContext } from './luaIdioms';
import { MAX_ROUTINE_STEPS } from './routines';
import {
  genericForEntries,
  isPureWait,
  isYieldCall,
  numericForValues,
  truthOf,
} from './luaControl';
import {
  asCall,
  evalLua,
  LuaScope,
  sideEffectCall,
  UNKNOWN,
  type LuaCall,
  type LuaValue,
} from './luaValues';

/** How deep helper functions are inlined into a click function or `onLoad`. */
export const MAX_INLINE_DEPTH = 4;

/** Chat output and vector paint: nothing of it exists on the 2D table. */
const NO_TABLE_EFFECT = new Set([
  'broadcastToAll',
  'broadcastToColor',
  'printToAll',
  'printToColor',
  'print',
  'log',
  'clearVectorPaint',
]);

const BUTTON_CALLS = new Set(['createButton', 'editButton']);

/** One parsed script: Global or one object's, with its functions and top-level bindings. */
export interface LuaScriptInfo {
  /** `global` or the sidecar key (TTS GUID). */
  key: string;
  chunk: Chunk;
  scope: LuaScope;
  functions: Map<string, FunctionDeclaration>;
}

/** A `createButton` call found while walking. */
export interface RawLuaButton {
  script: LuaScriptInfo;
  /** Object the button is created on (`self`, a GUID variable, …). */
  owner: LuaValue;
  params: LuaValue;
  /** Inside a loop, branch or other code the walker cannot follow. */
  dynamic: boolean;
}

/** `IfStatement` → `if`, for the report. */
const statementReason = (type: string) => type.replace(/Statement$/, '').toLowerCase() || type;

export class LuaBodyWalker {
  readonly steps: RoutineStep[] = [];
  /** Click mode: the first untranslatable call or statement. */
  failure: string | undefined;
  /** Setup mode: false once a statement other than a binding or `createButton` was seen. */
  consumed = true;
  private readonly inlining = new Set<string>();
  /** A `return` was reached in the function being walked. */
  private returned = false;

  private readonly script: LuaScriptInfo;
  private readonly mode: 'setup' | 'click';
  private readonly ctx: LuaTranslateContext;
  private readonly buttons: RawLuaButton[];
  private readonly seen: Set<LuaNode>;

  constructor(
    script: LuaScriptInfo,
    mode: 'setup' | 'click',
    ctx: LuaTranslateContext,
    buttons: RawLuaButton[] = [],
    seen: Set<LuaNode> = new Set(),
  ) {
    this.script = script;
    this.mode = mode;
    this.ctx = ctx;
    this.buttons = buttons;
    this.seen = seen;
  }

  run(body: LuaNode[], scope: LuaScope, depth = 0): void {
    for (const statement of body) {
      if (this.failure || this.returned) return;
      this.statement(statement, scope, depth);
    }
  }

  private fail(reason: string): void {
    if (this.mode === 'click') this.failure ??= reason;
    else this.consumed = false;
  }

  private readonly exists = (guid: string) => (this.ctx.targets[guid] ? true : undefined);

  private statement(node: LuaNode, scope: LuaScope, depth: number): void {
    switch (node.type) {
      case 'LocalStatement': {
        const s = node as LocalStatement;
        const values = this.values(s.init, s.variables.length, scope, depth);
        s.variables.forEach((v, i) => scope.declare(v.name, values?.[i] ?? UNKNOWN));
        return;
      }
      case 'AssignmentStatement':
        return this.assignment(node as AssignmentStatement, scope, depth);
      case 'CallStatement': {
        const call = asCall((node as CallStatement).expression);
        return call ? this.call(call, scope, depth) : this.fail('call');
      }
      case 'ReturnStatement':
        this.values((node as ReturnStatement).arguments, 0, scope, depth);
        this.returned = true;
        return;
      case 'IfStatement':
        return this.branch(node as IfStatement, scope, depth);
      case 'ForGenericStatement':
      case 'ForNumericStatement':
        return this.loop(node as ForGenericStatement | ForNumericStatement, scope, depth);
      case 'WhileStatement':
      case 'RepeatStatement':
        // A loop that only yields is a wait; any other loop depends on run-time state.
        return isPureWait((node as BlockStatement).body)
          ? undefined
          : this.fail(statementReason(node.type));
      case 'DoStatement':
        return this.run((node as BlockStatement).body, new LuaScope(scope), depth);
      default:
        return this.fail(statementReason(node.type));
    }
  }

  /**
   * Values of the right-hand sides. A call to a helper or a button call is walked like a
   * statement and its result is unknown; null when one of them cannot be translated.
   */
  private isHelper(call: LuaCall): boolean {
    return !call.receiver && this.script.functions.has(call.name);
  }

  private values(
    init: LuaNode[],
    count: number,
    scope: LuaScope,
    depth: number,
  ): LuaValue[] | null {
    const values: LuaValue[] = [];
    for (const node of init) {
      const effect = sideEffectCall(node);
      const called = effect ? asCall(node) : null;
      // Only calls whose result a script rarely needs: its own helpers and button calls.
      const call =
        called && (this.isHelper(called) || BUTTON_CALLS.has(called.name)) ? called : null;
      if (call) this.call(call, scope, depth);
      else if (effect) this.fail(effect);
      if (this.failure) return null;
      values.push(call ? UNKNOWN : evalLua(node, scope));
    }
    while (values.length < count) values.push(UNKNOWN);
    return values;
  }

  private assignment(s: AssignmentStatement, scope: LuaScope, depth: number): void {
    const values = this.values(s.init, s.variables.length, scope, depth);
    if (!values) return;
    s.variables.forEach((target, i) => {
      if (target.type === 'Identifier') return scope.assign((target as Identifier).name, values[i]);
      const member = target as MemberExpression;
      const table = target.type === 'MemberExpression' ? evalLua(member.base, scope) : UNKNOWN;
      if (table.k === 'table' && member.indexer === '.') {
        table.fields.set(member.identifier.name, values[i]);
      } else {
        this.fail('assignment');
      }
    });
  }

  private branch(node: IfStatement, scope: LuaScope, depth: number): void {
    for (const clause of node.clauses) {
      const holds = clause.condition ? truthOf(clause.condition, scope, this.exists) : true;
      if (holds === undefined) return this.fail('if');
      if (holds) return this.run(clause.body, new LuaScope(scope), depth);
    }
  }

  private loop(node: ForGenericStatement | ForNumericStatement, scope: LuaScope, depth: number) {
    const rounds: [string, LuaValue][][] | undefined =
      node.type === 'ForNumericStatement'
        ? numericForValues(node, scope)?.map((v) => [[node.variable.name, { k: 'num', v }]])
        : genericForEntries(node, scope)?.map((entry) =>
            node.variables.map((v, i): [string, LuaValue] => [v.name, entry[i] ?? UNKNOWN]),
          );
    if (!rounds) return this.fail(statementReason(node.type));
    for (const bindings of rounds) {
      const inner = new LuaScope(scope);
      for (const [name, value] of bindings) inner.declare(name, value);
      this.run(node.body, inner, depth);
      if (this.steps.length > MAX_ROUTINE_STEPS) this.fail('too_many_steps');
      if (this.failure || this.returned) return;
    }
  }

  /** Walks a function of this script (or an inline callback) as if it were called here. */
  private inline(name: string, fn: FunctionDeclaration, args: LuaValue[], depth: number): void {
    if (depth >= MAX_INLINE_DEPTH || this.inlining.has(name)) return this.fail(name);
    const inner = new LuaScope(this.script.scope);
    fn.parameters.forEach((p, i) => {
      if (p.type === 'Identifier') inner.declare((p as Identifier).name, args[i] ?? UNKNOWN);
    });
    this.inlining.add(name);
    this.run(fn.body, inner, depth + 1);
    this.inlining.delete(name);
    this.returned = false;
  }

  /** `startLuaCoroutine(self, 'fn')` and `Wait.frames/time(fn, n)`: run `fn`, without the wait. */
  private deferred(call: LuaCall, scope: LuaScope, depth: number): boolean {
    if (call.name === 'startLuaCoroutine' && !call.receiver) {
      const owner = call.args[0] ? evalLua(call.args[0], scope) : UNKNOWN;
      const name = call.args[1] ? evalLua(call.args[1], scope) : UNKNOWN;
      const own = owner.k === 'obj' ? owner.guid === this.script.key : owner.k === 'global';
      const fn = name.k === 'str' ? this.script.functions.get(name.v) : undefined;
      if (!fn || !own || (owner.k === 'global' && this.script.key !== 'global')) {
        this.fail(call.name);
      } else this.inline((name as { v: string }).v, fn, [], depth);
      return true;
    }
    if (call.name !== 'Wait.frames' && call.name !== 'Wait.time') return false;
    const [callback, , repeat] = call.args;
    const named =
      callback?.type === 'Identifier'
        ? this.script.functions.get((callback as Identifier).name)
        : undefined;
    const fn = callback?.type === 'FunctionDeclaration' ? (callback as FunctionDeclaration) : named;
    if (!fn || repeat) this.fail(call.name);
    else this.inline(named ? (callback as Identifier).name : `<${call.name}>`, fn, [], depth);
    return true;
  }

  private call(call: LuaCall, scope: LuaScope, depth: number): void {
    const effect = call.args.map(sideEffectCall).find(Boolean);
    if (effect) return this.fail(effect);
    if ((!call.receiver && NO_TABLE_EFFECT.has(call.name)) || isYieldCall(call)) return;
    if (this.deferred(call, scope, depth)) return;
    if (call.receiver && call.name === 'createButton') {
      if (this.mode === 'click') return this.fail('createButton');
      const owner = evalLua(call.receiver, scope);
      const params = call.args[0] ? evalLua(call.args[0], scope) : UNKNOWN;
      // Parameters built at run time: left to the per-call-site fallback (one inert button).
      if (params.k !== 'table') return this.fail('createButton');
      this.seen.add(call.callee);
      this.buttons.push({ script: this.script, owner, params, dynamic: false });
      return;
    }
    // Restyling a button (label, colour) changes nothing on the table.
    if (call.receiver && call.name === 'editButton' && this.mode === 'click') return;
    if (call.receiver && TRANSLATED_METHODS.has(call.name) && this.mode === 'click') {
      const receiver = evalLua(call.receiver, scope);
      const target = receiver.k === 'obj' ? this.ctx.targets[receiver.guid] : undefined;
      const args = call.args.map((a) => evalLua(a, scope));
      const steps = idiomSteps(call.name, target, args, this.ctx);
      if (!steps) return this.fail(call.name);
      this.steps.push(...steps);
      return;
    }
    const helper = call.receiver ? undefined : this.script.functions.get(call.name);
    if (!helper) return this.fail(call.name);
    this.inline(
      call.name,
      helper,
      call.args.map((a) => evalLua(a, scope)),
      depth,
    );
  }
}

/** Every `createButton` callee node in a subtree (to find calls the walker never reached). */
export function findCreateButtonCalls(node: LuaNode, out: LuaCall[] = []): LuaCall[] {
  const call = asCall(node);
  if (call?.receiver && call.name === 'createButton') out.push(call);
  for (const value of Object.values(node)) {
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (child && typeof child === 'object' && typeof (child as LuaNode).type === 'string') {
        findCreateButtonCalls(child as LuaNode, out);
      }
    }
  }
  return out;
}

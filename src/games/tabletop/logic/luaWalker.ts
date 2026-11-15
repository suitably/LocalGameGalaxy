/**
 * Statement walker of the TTS Lua translator [ID: LOGIC-TABLETOP-LUA-WALKER]
 *
 * Walks a function body without running it. In `setup` mode (script top level and `onLoad`) it
 * records variable bindings and `createButton` calls; in `click` mode (a button's click
 * function) it turns every statement into routine steps and stops at the first one it cannot
 * translate, so a routine never runs half a script. Zero-argument-style helpers of the same
 * script are inlined (depth-limited, no recursion).
 */
import type {
  AssignmentStatement,
  CallStatement,
  Chunk,
  FunctionDeclaration,
  Identifier,
  LocalStatement,
  LuaNode,
  MemberExpression,
  ReturnStatement,
} from 'luaparse';
import type { RoutineStep } from './types';
import { idiomSteps, TRANSLATED_METHODS, type LuaTranslateContext } from './luaIdioms';
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
      if (this.failure) return;
      this.statement(statement, scope, depth);
    }
  }

  private fail(reason: string): void {
    if (this.mode === 'click') this.failure ??= reason;
    else this.consumed = false;
  }

  private statement(node: LuaNode, scope: LuaScope, depth: number): void {
    switch (node.type) {
      case 'LocalStatement': {
        const s = node as LocalStatement;
        const effect = s.init.map(sideEffectCall).find(Boolean);
        if (effect) return this.fail(effect);
        s.variables.forEach((v, i) =>
          scope.declare(v.name, s.init[i] ? evalLua(s.init[i], scope) : UNKNOWN),
        );
        return;
      }
      case 'AssignmentStatement':
        return this.assignment(node as AssignmentStatement, scope);
      case 'CallStatement': {
        const call = asCall((node as CallStatement).expression);
        return call ? this.call(call, scope, depth) : this.fail('call');
      }
      case 'ReturnStatement': {
        const effect = (node as ReturnStatement).arguments.map(sideEffectCall).find(Boolean);
        return effect ? this.fail(effect) : undefined;
      }
      default:
        return this.fail(statementReason(node.type));
    }
  }

  private assignment(s: AssignmentStatement, scope: LuaScope): void {
    const effect = s.init.map(sideEffectCall).find(Boolean);
    if (effect) return this.fail(effect);
    const values = s.variables.map((_, i) => (s.init[i] ? evalLua(s.init[i], scope) : UNKNOWN));
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

  private call(call: LuaCall, scope: LuaScope, depth: number): void {
    const effect = call.args.map(sideEffectCall).find(Boolean);
    if (effect) return this.fail(effect);
    if (!call.receiver && call.name === 'broadcastToAll') return; // chat message only
    if (call.receiver && call.name === 'createButton') {
      if (this.mode === 'click') return this.fail('createButton');
      this.seen.add(call.callee);
      const owner = evalLua(call.receiver, scope);
      const params = call.args[0] ? evalLua(call.args[0], scope) : UNKNOWN;
      this.buttons.push({ script: this.script, owner, params, dynamic: false });
      return;
    }
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
    if (depth >= MAX_INLINE_DEPTH || this.inlining.has(call.name)) return this.fail(call.name);
    const inner = new LuaScope(this.script.scope);
    helper.parameters.forEach((p, i) => {
      if (p.type === 'Identifier') {
        inner.declare(
          (p as Identifier).name,
          call.args[i] ? evalLua(call.args[i], scope) : UNKNOWN,
        );
      }
    });
    this.inlining.add(call.name);
    this.run(helper.body, inner, depth + 1);
    this.inlining.delete(call.name);
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

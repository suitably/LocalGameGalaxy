/**
 * Static values of TTS Lua expressions [ID: LOGIC-TABLETOP-LUA-VALUES]
 *
 * Part of the Lua → routine translator (`luaTranslator.ts`, TTS plan slice 8). Evaluates only
 * what is knowable without running code: literals, string concatenation, tables of literals,
 * variables bound to them, `getObjectFromGUID('…')`, `self` and `Global`. Anything else is
 * `unknown`, so a step that needs it is not translated instead of guessed.
 */
import luaparse from 'luaparse';
import type {
  BinaryExpression,
  BooleanLiteral,
  CallExpression,
  Chunk,
  Identifier,
  IndexExpression,
  LuaNode,
  MemberExpression,
  NumericLiteral,
  StringCallExpression,
  StringLiteral,
  TableCallExpression,
  TableConstructorExpression,
  UnaryExpression,
} from 'luaparse';

export type LuaValue =
  | { k: 'str'; v: string }
  | { k: 'num'; v: number }
  | { k: 'bool'; v: boolean }
  /** A table object, by TTS GUID. */
  | { k: 'obj'; guid: string }
  | { k: 'global' }
  | { k: 'table'; fields: Map<string, LuaValue> }
  | { k: 'unknown' };

export const UNKNOWN: LuaValue = { k: 'unknown' };

/** Variables visible to a statement: innermost scope first. */
export class LuaScope {
  private readonly vars = new Map<string, LuaValue>();
  private readonly parent?: LuaScope;
  constructor(parent?: LuaScope) {
    this.parent = parent;
  }

  get(name: string): LuaValue | undefined {
    return this.vars.get(name) ?? this.parent?.get(name);
  }
  has(name: string): boolean {
    return this.vars.has(name) || Boolean(this.parent?.has(name));
  }
  /** Declares in this scope (`local`, parameters). */
  declare(name: string, value: LuaValue): void {
    this.vars.set(name, value);
  }
  /** Assigns to the scope that declared `name`, else to the outermost (global) scope. */
  assign(name: string, value: LuaValue): void {
    if (this.vars.has(name) || !this.parent) this.vars.set(name, value);
    else this.parent.assign(name, value);
  }
}

/** Upper bound for one script; bigger ones are reported instead of parsed. */
export const MAX_LUA_SOURCE = 1_000_000;

/** Parses a script (Lua 5.3 grammar, a superset of TTS' MoonSharp 5.2), or null on error. */
export function parseLua(source: string): Chunk | null {
  if (source.length > MAX_LUA_SOURCE) return null;
  try {
    return luaparse.parse(source, {
      luaVersion: '5.3',
      comments: false,
      locations: false,
      scope: false,
      encodingMode: 'none',
    });
  } catch {
    return null;
  }
}

const ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  '\\': '\\',
  '"': '"',
  "'": "'",
};

/** The value of a string literal from its source text (`encodingMode: 'none'` drops values). */
export function decodeLuaString(raw: string): string {
  const long = /^\[(=*)\[\n?([\s\S]*)\]\1\]$/.exec(raw);
  if (long) return long[2];
  return raw.slice(1, -1).replace(/\\(.)/g, (_, c: string) => ESCAPES[c] ?? c);
}

/** Call node normalised: callee, method name (for `a.m()` / `a:m()`) and argument nodes. */
export interface LuaCall {
  callee: LuaNode;
  /** Object the method is called on; undefined for a plain function call. */
  receiver?: LuaNode;
  name: string;
  args: LuaNode[];
}

export function asCall(node: LuaNode): LuaCall | null {
  let callee: LuaNode;
  let args: LuaNode[];
  if (node.type === 'CallExpression') {
    const n = node as CallExpression;
    [callee, args] = [n.base, n.arguments];
  } else if (node.type === 'StringCallExpression') {
    const n = node as StringCallExpression;
    [callee, args] = [n.base, [n.argument]];
  } else if (node.type === 'TableCallExpression') {
    const n = node as TableCallExpression;
    [callee, args] = [n.base, [n.arguments]];
  } else {
    return null;
  }
  if (callee.type === 'Identifier') return { callee, name: (callee as Identifier).name, args };
  if (callee.type === 'MemberExpression') {
    const m = callee as MemberExpression;
    const base = m.base.type === 'Identifier' ? (m.base as Identifier).name : '';
    // `Wait.time`, `JSON.encode`: namespaced globals are reported with their namespace.
    const name =
      /^[A-Z]/.test(base) && base !== 'Global' && m.indexer === '.'
        ? `${base}.${m.identifier.name}`
        : m.identifier.name;
    return { callee, receiver: m.base, name, args };
  }
  return { callee, name: callee.type, args };
}

const isCallNode = (n: LuaNode) =>
  n.type === 'CallExpression' ||
  n.type === 'StringCallExpression' ||
  n.type === 'TableCallExpression';

/** Name of the first call in an expression that has side effects, if any. */
export function sideEffectCall(node: LuaNode): string | undefined {
  if (isCallNode(node)) {
    const call = asCall(node);
    if (call?.name !== 'getObjectFromGUID') return call?.name ?? node.type;
    return call.args.map(sideEffectCall).find(Boolean);
  }
  if (node.type === 'BinaryExpression') {
    const b = node as BinaryExpression;
    return sideEffectCall(b.left) ?? sideEffectCall(b.right);
  }
  if (node.type === 'TableConstructorExpression') {
    return (node as TableConstructorExpression).fields
      .map((f) => sideEffectCall(f.value))
      .find(Boolean);
  }
  return undefined;
}

function tableValue(node: TableConstructorExpression, scope: LuaScope): LuaValue {
  const fields = new Map<string, LuaValue>();
  let index = 1;
  for (const f of node.fields) {
    if (f.type === 'TableValue') fields.set(String(index++), evalLua(f.value, scope));
    else if (f.type === 'TableKeyString') fields.set(f.key.name, evalLua(f.value, scope));
    else {
      const key = evalLua(f.key, scope);
      if (key.k === 'str' || key.k === 'num') fields.set(String(key.v), evalLua(f.value, scope));
    }
  }
  return { k: 'table', fields };
}

/** Field `key` of a table value. */
export function fieldOf(value: LuaValue, key: string): LuaValue {
  return value.k === 'table' ? (value.fields.get(key) ?? UNKNOWN) : UNKNOWN;
}

/** The statically known value of an expression. */
export function evalLua(node: LuaNode, scope: LuaScope): LuaValue {
  switch (node.type) {
    case 'StringLiteral':
      return { k: 'str', v: decodeLuaString((node as StringLiteral).raw) };
    case 'NumericLiteral':
      return { k: 'num', v: (node as NumericLiteral).value };
    case 'BooleanLiteral':
      return { k: 'bool', v: (node as BooleanLiteral).value };
    case 'Identifier':
      return scope.get((node as Identifier).name) ?? UNKNOWN;
    case 'UnaryExpression': {
      const u = node as UnaryExpression;
      const arg = evalLua(u.argument, scope);
      return u.operator === '-' && arg.k === 'num' ? { k: 'num', v: -arg.v } : UNKNOWN;
    }
    case 'BinaryExpression': {
      const b = node as BinaryExpression;
      const [l, r] = [evalLua(b.left, scope), evalLua(b.right, scope)];
      const text = (v: LuaValue) => (v.k === 'str' || v.k === 'num' ? String(v.v) : null);
      if (b.operator !== '..' || text(l) === null || text(r) === null) return UNKNOWN;
      return { k: 'str', v: `${text(l)}${text(r)}` };
    }
    case 'MemberExpression': {
      const m = node as MemberExpression;
      return m.indexer === '.' ? fieldOf(evalLua(m.base, scope), m.identifier.name) : UNKNOWN;
    }
    case 'IndexExpression': {
      const ix = node as IndexExpression;
      const key = evalLua(ix.index, scope);
      return key.k === 'str' || key.k === 'num'
        ? fieldOf(evalLua(ix.base, scope), String(key.v))
        : UNKNOWN;
    }
    case 'TableConstructorExpression':
      return tableValue(node as TableConstructorExpression, scope);
    default: {
      const call = isCallNode(node) ? asCall(node) : null;
      if (call?.name !== 'getObjectFromGUID' || call.receiver) return UNKNOWN;
      const guid = call.args[0] ? evalLua(call.args[0], scope) : UNKNOWN;
      return guid.k === 'str' ? { k: 'obj', guid: guid.v } : UNKNOWN;
    }
  }
}

/** Number value, or undefined. */
export const numOf = (v: LuaValue): number | undefined => (v.k === 'num' ? v.v : undefined);
/** String value, or undefined. */
export const strOf = (v: LuaValue): string | undefined => (v.k === 'str' ? v.v : undefined);

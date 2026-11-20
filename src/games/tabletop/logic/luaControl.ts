/**
 * Control flow the TTS Lua translator can resolve statically [ID: LOGIC-TABLETOP-LUA-CONTROL]
 *
 * Conditions over known values (`if Done == false`, `if deck ~= nil`), the entries of
 * `pairs`/`ipairs` over a literal table, numeric `for` ranges and loops that only wait
 * (`while n > 0 do coroutine.yield(0) n = n - 1 end`). Anything that depends on the table at run
 * time stays undefined, so the walker leaves the function untranslated.
 */
import type {
  BinaryExpression,
  CallStatement,
  ForGenericStatement,
  ForNumericStatement,
  Identifier,
  LocalStatement,
  LogicalExpression,
  LuaNode,
  UnaryExpression,
} from 'luaparse';
import {
  asCall,
  evalLua,
  luaEquals,
  sideEffectCall,
  type LuaCall,
  type LuaScope,
  type LuaValue,
} from './luaValues';

/** Iterations one loop may unroll into a routine. */
export const MAX_LOOP_ITERATIONS = 100;

/** Whether an object by GUID is on the table; undefined when that is not known. */
export type ObjectExists = (guid: string) => boolean | undefined;

function truthOfValue(value: LuaValue, exists: ObjectExists): boolean | undefined {
  switch (value.k) {
    case 'bool':
      return value.v;
    case 'nil':
      return false;
    case 'str':
    case 'num':
    case 'table':
    case 'global':
      return true;
    case 'obj':
      return exists(value.guid);
    default:
      return undefined;
  }
}

/** Whether a condition holds, when its operands are statically known. */
export function truthOf(node: LuaNode, scope: LuaScope, exists: ObjectExists): boolean | undefined {
  if (sideEffectCall(node)) return undefined;
  if (node.type === 'LogicalExpression') {
    const l = node as LogicalExpression;
    const [a, b] = [truthOf(l.left, scope, exists), truthOf(l.right, scope, exists)];
    if (l.operator === 'and') return a === false || b === false ? false : a && b;
    return a === true || b === true ? true : a === undefined ? undefined : b;
  }
  if (node.type === 'UnaryExpression' && (node as UnaryExpression).operator === 'not') {
    const inner = truthOf((node as UnaryExpression).argument, scope, exists);
    return inner === undefined ? undefined : !inner;
  }
  if (node.type === 'BinaryExpression') {
    const b = node as BinaryExpression;
    if (b.operator === '==' || b.operator === '~=') {
      const [l, r] = [evalLua(b.left, scope), evalLua(b.right, scope)];
      // `obj ~= nil`: an object that is on the table exists; a missing GUID stays unknown.
      const obj = l.k === 'obj' && r.k === 'nil' ? l : r.k === 'obj' && l.k === 'nil' ? r : null;
      const eq = obj ? (exists(obj.guid) ? false : undefined) : luaEquals(l, r);
      return eq === undefined ? undefined : (b.operator === '==') === eq;
    }
  }
  return truthOfValue(evalLua(node, scope), exists);
}

const keyValue = (key: string): LuaValue =>
  /^-?\d+$/.test(key) ? { k: 'num', v: Number(key) } : { k: 'str', v: key };

/** `[key, value]` pairs a generic `for` visits, or null when its table is not a literal. */
export function genericForEntries(
  node: ForGenericStatement,
  scope: LuaScope,
): [LuaValue, LuaValue][] | null {
  const call = node.iterators.length === 1 ? asCall(node.iterators[0]) : null;
  if (!call || call.receiver || (call.name !== 'pairs' && call.name !== 'ipairs')) return null;
  const table = call.args.length === 1 ? evalLua(call.args[0], scope) : null;
  if (table?.k !== 'table' || table.fields.size > MAX_LOOP_ITERATIONS) return null;
  if (call.name === 'pairs') return [...table.fields].map(([k, v]) => [keyValue(k), v]);
  const entries: [LuaValue, LuaValue][] = [];
  for (let i = 1; table.fields.has(String(i)); i++) {
    entries.push([{ k: 'num', v: i }, table.fields.get(String(i)) as LuaValue]);
  }
  return entries;
}

/** The values a numeric `for` counts through, or null when its bounds are not known. */
export function numericForValues(node: ForNumericStatement, scope: LuaScope): number[] | null {
  const num = (n: LuaNode | null) => {
    const v = n ? evalLua(n, scope) : null;
    return v?.k === 'num' ? v.v : undefined;
  };
  const [start, end, step] = [num(node.start), num(node.end), node.step ? num(node.step) : 1];
  if (start === undefined || end === undefined || !step) return null;
  const values: number[] = [];
  for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
    if (values.length >= MAX_LOOP_ITERATIONS) return null;
    values.push(i);
  }
  return values;
}

/** `coroutine.yield(…)`: gives the frame back to TTS, nothing happens on the table. */
export function isYieldCall(call: LuaCall | null): boolean {
  return (
    call?.name === 'yield' &&
    call.receiver?.type === 'Identifier' &&
    (call.receiver as Identifier).name === 'coroutine'
  );
}

/** A loop body that only yields and counts: a wait, which a routine does not need. */
export function isPureWait(body: LuaNode[]): boolean {
  return body.every((s) => {
    if (s.type === 'CallStatement') return isYieldCall(asCall((s as CallStatement).expression));
    if (s.type !== 'AssignmentStatement' && s.type !== 'LocalStatement') return false;
    const a = s as LocalStatement;
    return a.variables.every((v) => v.type === 'Identifier') && !a.init.some(sideEffectCall);
  });
}

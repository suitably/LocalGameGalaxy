/**
 * Vendored minimal types for luaparse 0.3.1 (no upstream typings; ADR-0005: pinned version,
 * vendored types). Only the AST nodes the TTS Lua translator reads are typed precisely; every
 * other node is a `LuaNode` with its `type` string.
 */
declare module 'luaparse' {
  export interface LuaNode {
    type: string;
  }

  export interface Identifier extends LuaNode {
    type: 'Identifier';
    name: string;
  }
  export interface StringLiteral extends LuaNode {
    type: 'StringLiteral';
    /** `null` with `encodingMode: 'none'`; decode `raw` instead. */
    value: string | null;
    raw: string;
  }
  export interface NumericLiteral extends LuaNode {
    type: 'NumericLiteral';
    value: number;
    raw: string;
  }
  export interface BooleanLiteral extends LuaNode {
    type: 'BooleanLiteral';
    value: boolean;
  }
  export interface UnaryExpression extends LuaNode {
    type: 'UnaryExpression';
    operator: string;
    argument: LuaNode;
  }
  export interface BinaryExpression extends LuaNode {
    type: 'BinaryExpression';
    operator: string;
    left: LuaNode;
    right: LuaNode;
  }
  export interface MemberExpression extends LuaNode {
    type: 'MemberExpression';
    indexer: '.' | ':';
    identifier: Identifier;
    base: LuaNode;
  }
  export interface IndexExpression extends LuaNode {
    type: 'IndexExpression';
    base: LuaNode;
    index: LuaNode;
  }
  export interface CallExpression extends LuaNode {
    type: 'CallExpression';
    base: LuaNode;
    arguments: LuaNode[];
  }
  export interface StringCallExpression extends LuaNode {
    type: 'StringCallExpression';
    base: LuaNode;
    argument: StringLiteral;
  }
  export interface TableCallExpression extends LuaNode {
    type: 'TableCallExpression';
    base: LuaNode;
    arguments: TableConstructorExpression;
  }
  export interface TableKey extends LuaNode {
    type: 'TableKey';
    key: LuaNode;
    value: LuaNode;
  }
  export interface TableKeyString extends LuaNode {
    type: 'TableKeyString';
    key: Identifier;
    value: LuaNode;
  }
  export interface TableValue extends LuaNode {
    type: 'TableValue';
    value: LuaNode;
  }
  export interface TableConstructorExpression extends LuaNode {
    type: 'TableConstructorExpression';
    fields: (TableKey | TableKeyString | TableValue)[];
  }
  export interface FunctionDeclaration extends LuaNode {
    type: 'FunctionDeclaration';
    identifier: LuaNode | null;
    isLocal: boolean;
    parameters: LuaNode[];
    body: LuaNode[];
  }
  export interface LocalStatement extends LuaNode {
    type: 'LocalStatement';
    variables: Identifier[];
    init: LuaNode[];
  }
  export interface AssignmentStatement extends LuaNode {
    type: 'AssignmentStatement';
    variables: LuaNode[];
    init: LuaNode[];
  }
  export interface CallStatement extends LuaNode {
    type: 'CallStatement';
    expression: LuaNode;
  }
  export interface ReturnStatement extends LuaNode {
    type: 'ReturnStatement';
    arguments: LuaNode[];
  }
  export interface LogicalExpression extends LuaNode {
    type: 'LogicalExpression';
    operator: 'and' | 'or';
    left: LuaNode;
    right: LuaNode;
  }
  /** `IfClause`, `ElseifClause` (both with `condition`) or `ElseClause`. */
  export interface IfClause extends LuaNode {
    condition?: LuaNode;
    body: LuaNode[];
  }
  export interface IfStatement extends LuaNode {
    type: 'IfStatement';
    clauses: IfClause[];
  }
  export interface ForGenericStatement extends LuaNode {
    type: 'ForGenericStatement';
    variables: Identifier[];
    iterators: LuaNode[];
    body: LuaNode[];
  }
  export interface ForNumericStatement extends LuaNode {
    type: 'ForNumericStatement';
    variable: Identifier;
    start: LuaNode;
    end: LuaNode;
    step: LuaNode | null;
    body: LuaNode[];
  }
  /** `WhileStatement`, `RepeatStatement` and `DoStatement` (no condition). */
  export interface BlockStatement extends LuaNode {
    condition?: LuaNode;
    body: LuaNode[];
  }
  export interface Chunk extends LuaNode {
    type: 'Chunk';
    body: LuaNode[];
  }

  export interface ParseOptions {
    luaVersion?: '5.1' | '5.2' | '5.3' | 'LuaJIT';
    comments?: boolean;
    locations?: boolean;
    ranges?: boolean;
    scope?: boolean;
    encodingMode?: 'none' | 'pseudo-latin1' | 'x-user-defined';
  }

  export function parse(code: string, options?: ParseOptions): Chunk;

  const luaparse: { parse: typeof parse };
  export default luaparse;
}

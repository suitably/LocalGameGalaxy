/** Static Lua analysis for TTS scripts (luaparse): called API functions and defined events. */
import luaparse from 'luaparse';

/** Lua standard library names — never counted as TTS API calls. */
const LUA_STD = new Set([
  'assert',
  'error',
  'getmetatable',
  'ipairs',
  'next',
  'pairs',
  'pcall',
  'print',
  'rawequal',
  'rawget',
  'rawlen',
  'rawset',
  'require',
  'select',
  'setmetatable',
  'tonumber',
  'tostring',
  'type',
  'unpack',
  'xpcall',
  'abs',
  'ceil',
  'floor',
  'max',
  'min',
  'random',
  'sqrt',
  'sin',
  'cos',
  'atan',
  'atan2',
  'pow',
  'huge',
  'format',
  'sub',
  'gsub',
  'gmatch',
  'match',
  'find',
  'rep',
  'lower',
  'upper',
  'len',
  'byte',
  'char',
  'insert',
  'remove',
  'concat',
  'sort',
  'time',
  'clock',
  'date',
  'floor',
  'fmod',
  'log',
  'exp',
  'rad',
  'deg',
  'randomseed',
]);

/** Events TTS calls on a script when something happens. */
export const TTS_EVENTS = new Set([
  'onLoad',
  'onSave',
  'onUpdate',
  'onFixedUpdate',
  'onDestroy',
  'onChat',
  'onExternalMessage',
  'onObjectDrop',
  'onObjectPickUp',
  'onObjectDestroy',
  'onObjectSpawn',
  'onObjectRandomize',
  'onObjectEnterContainer',
  'onObjectLeaveContainer',
  'onObjectEnterScriptingZone',
  'onObjectLeaveScriptingZone',
  'onObjectFlip',
  'onObjectRotate',
  'onObjectNumberTyped',
  'onObjectSearchStart',
  'onObjectSearchEnd',
  'onObjectStateChange',
  'onObjectPeek',
  'onObjectHover',
  'onObjectCollisionEnter',
  'onObjectCollisionStay',
  'onObjectCollisionExit',
  'onPlayerTurn',
  'onPlayerTurnStart',
  'onPlayerTurnEnd',
  'onPlayerConnect',
  'onPlayerDisconnect',
  'onPlayerChangeColor',
  'onPlayerAction',
  'onPlayerPing',
  'tryObjectEnterContainer',
  'tryObjectRandomize',
  'tryObjectRotate',
  'filterObjectEnterContainer',
  'onZoneGroupSwitch',
  'onBlindfold',
  'onGroupObjects',
  'onScriptingButtonDown',
  'onScriptingButtonUp',
  'onFlip',
]);

/** Lua libraries whose members are never TTS API. */
const LUA_LIBS = new Set(['string', 'table', 'math', 'os', 'io', 'coroutine', 'debug', 'utf8']);

/** `Wait.time` for TTS namespaces (capitalised globals), else the bare function/method name. */
function exprName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    const member = node.identifier?.name ?? null;
    const base = node.base;
    if (member && base?.type === 'Identifier' && node.indexer === '.') {
      if (LUA_LIBS.has(base.name)) return null;
      if (/^[A-Z]/.test(base.name)) return `${base.name}.${member}`;
    }
    return member;
  }
  return null;
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) walk(n, visit);
    return;
  }
  if (typeof node.type === 'string') visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range') continue;
    const v = node[key];
    if (v && typeof v === 'object') walk(v, visit);
  }
}

/**
 * @param {string} source Lua source
 * @returns {{ ok: boolean, error?: string, calls: string[], events: string[] }}
 *   `calls`: sorted unique called names that are neither defined in the script nor Lua stdlib;
 *   `events`: sorted unique TTS event handlers the script defines.
 */
export function analyzeLua(source) {
  let ast;
  try {
    ast = luaparse.parse(source, { luaVersion: '5.3', comments: false, locations: false });
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err).slice(0, 200), calls: [], events: [] };
  }
  const defined = new Set();
  const called = new Set();
  walk(ast, (n) => {
    if (n.type === 'FunctionDeclaration') {
      const name = exprName(n.identifier);
      if (name) defined.add(name);
    } else if (
      n.type === 'CallExpression' ||
      n.type === 'StringCallExpression' ||
      n.type === 'TableCallExpression'
    ) {
      const name = exprName(n.base);
      if (name) called.add(name);
    }
  });
  const events = [...defined].filter((name) => TTS_EVENTS.has(name)).sort();
  const calls = [...called]
    .filter((name) => name.includes('.') || (!defined.has(name) && !LUA_STD.has(name)))
    .sort();
  return { ok: true, calls, events };
}

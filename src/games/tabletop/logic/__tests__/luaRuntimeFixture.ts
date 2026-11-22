/** A small scripted table for the Lua runtime tests (#705). */
import type { TabletopAction } from '../tabletopReducer';
import type { GameScripts, TabletopGameDefinition } from '../types';
import type { LuaHostFunction, LuaValue, LuaVm } from '../luaVm';
import { hand, table, wid } from './routineFixture';

const card = (id: string) =>
  wid(id, {
    type: 'card',
    width: 60,
    height: 90,
    faceUp: false,
    rotation: 0,
    frontContent: { type: 'text', value: id },
    backContent: { type: 'text', value: '' },
  });

export function scriptedGame(scripts: Partial<GameScripts> = {}): TabletopGameDefinition {
  const game = table([
    wid('deck1', {
      type: 'deck',
      x: 100,
      y: 100,
      width: 60,
      height: 90,
      cardIds: ['c1', 'c2', 'c3'],
      backContent: { type: 'text', value: '' },
    }),
    card('c1'),
    card('c2'),
    card('c3'),
    hand('h0', 0),
    hand('h1', 1),
    wid('tok1', { type: 'token', x: 400, y: 400, width: 40, height: 40, label: 'Token' }),
    wid('die1', { type: 'die', sides: 6, currentValue: 1 }),
    wid('seat0', { type: 'seat', index: 0, color: '#fff', hand: 'h0', turn: true }),
    wid('seat1', { type: 'seat', index: 1, color: '#f00', hand: 'h1' }),
  ]).game;
  return {
    ...game,
    scriptZones: { zone1: { id: 'zone1', x: 380, y: 380, width: 100, height: 100 } },
    scripts: {
      objects: {},
      seatColors: ['White', 'Red'],
      projection: { minX: 0, maxZ: 20, scale: 50, margin: 0 },
      ...scripts,
    },
  };
}

/** Collects what a session sends to the host. */
export function recorder() {
  const intents: TabletopAction[] = [];
  const prints: { text: string; to: string }[] = [];
  const unshimmed: string[] = [];
  return {
    intents,
    prints,
    unshimmed,
    out: {
      intent: (a: TabletopAction) => intents.push(a),
      print: (text: string, _c: string | undefined, to: string) => prints.push({ text, to }),
      unshimmed: (n: string) => unshimmed.push(n),
    },
  };
}

/**
 * A fake VM: the "scripts" are JS functions keyed by source text that call the host function
 * the way the Lua prelude would. Exercises the session and shim without wasmoon.
 */
export type FakeScript = (
  host: LuaHostFunction,
  entry: string,
  args: LuaValue[],
) => LuaValue | undefined;

export function fakeVm(scripts: Record<string, FakeScript>) {
  let host: LuaHostFunction = () => undefined;
  const loaded: string[] = [];
  const vm: LuaVm = {
    setHostFunction: (_name, fn) => {
      host = fn;
    },
    run: async () => {},
    call: (name, ...args) => {
      if (name === '__rt_load') {
        loaded.push(String(args[1]));
        return true;
      }
      let result: LuaValue | undefined;
      for (const src of loaded) result = scripts[src]?.(host, name, args) ?? result;
      return result;
    },
    close: () => {},
  };
  return { vm, loaded, host: () => host };
}

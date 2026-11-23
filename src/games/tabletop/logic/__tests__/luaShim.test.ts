/** TTS shim v1 through the `LuaVm` interface with a fake VM (#705). */
import { describe, expect, it } from 'vitest';
import type { LuaHostFunction, LuaValue } from '../luaVm';
import { toLuaValue } from '../luaVm';
import { createLuaSession } from '../luaSession';
import { acceptScriptIntent } from '../luaScriptIntent';
import { worldToTopLeft, widgetToWorld } from '../luaProjection';
import { fakeVm, recorder, scriptedGame, type FakeScript } from './luaRuntimeFixture';
import type { TabletopGameDefinition } from '../types';

/** Runs `body` as the Global script's onLoad and returns what it returned plus the records. */
async function onLoad(
  body: (host: LuaHostFunction) => LuaValue | undefined,
  game = scriptedGame(),
) {
  let result: LuaValue | undefined;
  const script: FakeScript = (host, entry) => {
    if (entry === '__rt_start') result = body(host);
    return undefined;
  };
  const withScript: TabletopGameDefinition = {
    ...game,
    scripts: { ...game.scripts!, global: { lua: 'global' } },
  };
  const { vm } = fakeVm({ global: script });
  const rec = recorder();
  const session = createLuaSession(vm, withScript, rec.out, { seed: 1 });
  await session.start();
  return { result, rec, session, game: withScript };
}

const obj = (guid: string) => ({ __obj: guid });

describe('Lua shim v1', () => {
  it('reads positions through the inverse projection and moves by world position', async () => {
    const game = scriptedGame();
    const p = game.scripts!.projection!;
    expect(worldToTopLeft(widgetToWorld(game.widgets.tok1, p), game.widgets.tok1, p)).toEqual({
      x: 400,
      y: 400,
    });
    const { result, rec } = await onLoad((host) => {
      host('obj', 'tok1', 'setPosition', { x: 1, y: 0, z: 19 });
      return host('obj', 'tok1', 'getPosition');
    });
    expect(rec.intents).toMatchObject([
      { type: 'MOVE_WIDGET', payload: { id: 'tok1', x: 30, y: 30 } },
    ]);
    // the script reads its own write from the mirror (a move also raises it)
    expect(result).toMatchObject({ x: 1, z: 19 });
  });

  it('deals, takes and puts back as reducer intents with host-decided results', async () => {
    const { result, rec } = await onLoad((host) => {
      host('obj', 'deck1', 'deal', 1, 'Red');
      const taken = host('obj', 'deck1', 'takeObject', { position: [2, 1, 10], flip: true });
      host('obj', 'deck1', 'putObject', taken);
      return [taken ?? false, host('obj', 'deck1', 'getQuantity') ?? false];
    });
    expect(rec.intents.map((a) => a.type)).toEqual([
      'DRAW_CARD',
      'DRAW_CARD',
      'RETURN_CARD_TO_DECK',
    ]);
    expect(rec.intents[0]).toMatchObject({ payload: { deckId: 'deck1', targetHolderId: 'h1' } });
    expect(rec.intents[1]).toMatchObject({ payload: { cardId: 'c2', faceUp: true } });
    expect(result).toEqual([obj('c2'), 2]);
    expect(rec.intents.every((a) => a.host?.seed !== undefined)).toBe(true);
  });

  it('creates, edits and clears buttons the host accepts', async () => {
    const { rec, game } = await onLoad((host) => {
      host('obj', 'tok1', 'createButton', {
        click_function: 'go',
        function_owner: obj('tok1'),
        label: 'Go',
      });
      host('obj', 'tok1', 'editButton', { index: 0, label: 'Again' });
      host('obj', 'tok1', 'clearButtons');
      return undefined;
    });
    expect(rec.intents.map((a) => a.type)).toEqual([
      'ADD_WIDGET',
      'PATCH_WIDGETS',
      'DELETE_WIDGETS',
    ]);
    expect(rec.intents[0]).toMatchObject({
      payload: { widget: { id: 'lua_rt_tok1_0', text: 'Go' } },
    });
    expect(acceptScriptIntent(rec.intents[0], game)).toBe(true);
  });

  it('answers players, turns, notes, JSON and tags', async () => {
    const { result, rec, session } = await onLoad((host) => {
      host('turns', 'set:turn_color', 'Red');
      host('notes', 'set', 'hello');
      return [
        host('seated') ?? false,
        host('turns', 'get:turn_color') ?? false,
        host('player', 'Red', 'getHandCount') ?? false,
        host('json_decode', host('json_encode', { a: [1, 2] })) ?? false,
        host('notes', 'get') ?? false,
      ];
    });
    expect(rec.intents).toMatchObject([{ type: 'NEXT_TURN', payload: { seat: 1 } }]);
    expect(result).toEqual([['White', 'Red'], 'Red', 0, { a: [1, 2] }, 'hello']);
    expect(session.save().meta.notes).toBe('hello');
  });

  it('reports unshimmed calls instead of throwing, and reads scripting zones', async () => {
    const { result, rec } = await onLoad((host) => {
      host('obj', 'tok1', 'getBounds');
      host('obj', 'zone1', 'getRotation');
      return [host('obj', 'zone1', 'getObjects') ?? false, host('exists', 'nope') ?? false];
    });
    expect(rec.unshimmed).toEqual(['Object.getBounds', 'Zone.getRotation']);
    expect(result).toEqual([[obj('tok1')], false]);
  });

  it('caps the intents one entry may emit', async () => {
    const game = scriptedGame();
    const script: FakeScript = (host, entry) => {
      if (entry === '__rt_start') for (let i = 0; i < 5; i++) host('obj', 'die1', 'roll');
      return undefined;
    };
    const { vm } = fakeVm({ global: script });
    const rec = recorder();
    const withScript = { ...game, scripts: { ...game.scripts!, global: { lua: 'global' } } };
    await createLuaSession(vm, withScript, rec.out, { maxIntents: 3 }).start();
    expect(rec.intents).toHaveLength(3);
    expect(rec.unshimmed).toEqual(['intent limit per call']);
  });

  it('drops nulls and functions at the VM boundary', () => {
    expect(toLuaValue({ a: null, b: [1, undefined, 2], c: () => 1, d: NaN })).toEqual({
      b: [1, 2],
    });
  });
});

describe('acceptScriptIntent', () => {
  const game = scriptedGame();
  it('accepts table actions and rejects seat takeovers and editor rewrites', () => {
    expect(
      acceptScriptIntent(
        { type: 'DRAW_CARD', payload: { deckId: 'deck1', targetHolderId: 'h0' } },
        game,
      ),
    ).toBe(true);
    const patch = (changes: Record<string, unknown>, id = 'tok1') =>
      acceptScriptIntent({ type: 'PATCH_WIDGETS', payload: { patches: { [id]: changes } } }, game);
    expect(patch({ label: 'x', pinned: true })).toBe(true);
    expect(patch({ ownerSeat: 1 })).toBe(false);
    expect(patch({ x: 5 })).toBe(false);
    expect(acceptScriptIntent({ type: 'DELETE_WIDGETS', payload: { ids: ['tok1'] } }, game)).toBe(
      false,
    );
    expect(acceptScriptIntent({ type: 'UPDATE_TABLE', payload: { changes: {} } }, game)).toBe(
      false,
    );
    expect(acceptScriptIntent({ type: 'LOAD_GAME', payload: game }, game)).toBe(false);
    const foreign = { ...game.widgets.tok1, id: 'other', type: 'button', text: '', routine: [] };
    expect(
      acceptScriptIntent({ type: 'ADD_WIDGET', payload: { widget: foreign } } as never, game),
    ).toBe(false);
  });
});

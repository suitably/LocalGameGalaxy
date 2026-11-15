import { describe, it, expect } from 'vitest';
import { parseTtsSaveFile } from '../ttsParser';
import { validateAndSanitizeGame } from '../gameValidator';
import { tabletopReducer } from '../tabletopReducer';
import type { ButtonWidget, DeckWidget, HolderWidget } from '../types';
import type { TTSObjectState, TTSSaveFile } from '../ttsTypes';
import { run } from './routineFixture';

// Hand-made save (no Workshop content, Q21): a deck, a red hand and a setup board with Lua.

const at = (posX: number, posZ: number) => ({
  posX,
  posY: 1,
  posZ,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
});

const piece = (GUID: string, Name: string, posX: number, more = {}) =>
  ({ GUID, Name, Transform: at(posX, 0), ...more }) as TTSObjectState;

const BOARD_LUA = `
function onLoad()
  self.createButton({ click_function = 'setup', function_owner = self, label = 'Setup' })
  self.createButton({ click_function = 'score', function_owner = self, label = 'Score' })
end
function setup()
  local deck = getObjectFromGUID('d00001')
  deck.shuffle()
  deck.deal(2, 'Red')
end
function score()
  for _, o in ipairs(getAllObjects()) do print(o) end
end`;

const SAVE: TTSSaveFile = {
  SaveName: 'Lua setup',
  ObjectStates: [
    piece('d00001', 'Deck', 0, { DeckIDs: [100, 101, 102] }),
    piece('h00001', 'HandTrigger', 5, { FogColor: 'Red' }),
    piece('b00001', 'Custom_Token', -5, { LuaScript: BOARD_LUA }),
  ],
};

describe('TTS import with Lua setup buttons (#704)', () => {
  const game = parseTtsSaveFile(SAVE);
  const buttons = Object.values(game.widgets).filter((w): w is ButtonWidget => w.type === 'button');

  it('adds a button per createButton, translated or inert', () => {
    expect(buttons.map((b) => b.text).sort()).toEqual(['Score', 'Setup']);
    const deckId = Object.values(game.widgets).find((w) => w.type === 'deck')?.id;
    expect(buttons.find((b) => b.text === 'Setup')?.routine).toEqual([
      { op: 'SHUFFLE', deck: deckId },
      { op: 'DRAW', deck: deckId, count: 2, to: 'h00001' },
    ]);
    expect(buttons.find((b) => b.text === 'Score')).toMatchObject({
      routine: [],
      untranslated: 'score',
    });
  });

  it('reports coverage and the untranslated functions, and both survive load', () => {
    const expected = {
      buttons: { total: 2, translated: 1 },
      // `for … in` is a generic for; the reason is the statement kind.
      untranslated: [{ owner: 'b00001', fn: 'score', reason: 'forgeneric' }],
    };
    expect(game.importReport).toMatchObject(expected);
    expect(validateAndSanitizeGame(game).importReport).toMatchObject(expected);
  });

  it('the translated routine runs on the table', () => {
    const setup = buttons.find((b) => b.text === 'Setup') as ButtonWidget;
    const next = tabletopReducer({ game, flyingCards: [] }, run(setup.id));
    const deck = Object.values(next.game.widgets).find((w) => w.type === 'deck') as DeckWidget;
    expect(deck.cardIds).toHaveLength(1);
    expect((next.game.widgets.h00001 as HolderWidget).childIds).toHaveLength(2);
  });

  it('an import without scripts has no Lua report fields', () => {
    const plain = parseTtsSaveFile({
      SaveName: 'x',
      ObjectStates: [piece('t1', 'Custom_Token', 0)],
    });
    expect(plain.importReport?.buttons).toBeUndefined();
    expect(plain.importReport?.untranslated).toBeUndefined();
  });
});

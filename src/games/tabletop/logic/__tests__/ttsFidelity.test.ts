import { describe, it, expect } from 'vitest';
import deLocale from '../../../../../public/locales/de/translation.json';
import enLocale from '../../../../../public/locales/en/translation.json';
import { parseTtsSaveFile } from '../ttsParser';
import { localizeLabels } from '../localizeLabels';
import type { TTSObjectState, TTSSaveFile } from '../ttsTypes';
import type {
  BagWidget,
  CardWidget,
  DeckWidget,
  HolderWidget,
  LabelWidget,
  TabletopWidget,
} from '../types';

const obj = (
  GUID: string,
  Name: string,
  fields: Partial<TTSObjectState> = {},
  rot: { rotY?: number; rotZ?: number } = {},
): TTSObjectState =>
  ({
    GUID,
    Name,
    Transform: {
      posX: 0,
      posY: 1,
      posZ: 0,
      rotX: 0,
      rotY: rot.rotY ?? 0,
      rotZ: rot.rotZ ?? 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
    },
    ...fields,
  }) as TTSObjectState;

const save = (ObjectStates: TTSObjectState[], extra: Partial<TTSSaveFile> = {}): TTSSaveFile => ({
  SaveName: 'Fixture',
  ObjectStates,
  ...extra,
});

const DECKS = {
  '1': { FaceURL: 'https://x/f', BackURL: 'https://x/b', NumWidth: 10, NumHeight: 7 },
};
const card = (guid: string, cardId: number, rot = {}) =>
  obj(guid, 'Card', { CardID: cardId, CustomDeck: DECKS }, rot);
const widgetsOf = (s: TTSSaveFile) => Object.values(parseTtsSaveFile(s).widgets);
const ofType = <T extends TabletopWidget>(ws: TabletopWidget[], type: string) =>
  ws.filter((w) => w.type === type) as T[];

describe('TTS parser fidelity (#683)', () => {
  it('keeps every card of decks whose cards repeat GUIDs', () => {
    const contained = [card('c1', 100), card('c2', 101), card('c3', 102)];
    const game = parseTtsSaveFile(
      save([
        obj('d1', 'Deck', { ContainedObjects: contained, CustomDeck: DECKS }),
        obj('d2', 'Deck', { ContainedObjects: contained, CustomDeck: DECKS }),
      ]),
    );
    const decks = ofType<DeckWidget>(Object.values(game.widgets), 'deck');
    expect(decks.map((d) => d.cardIds.length)).toEqual([3, 3]);
    const all = decks.flatMap((d) => d.cardIds);
    expect(new Set(all).size).toBe(6);
    expect(ofType<CardWidget>(Object.values(game.widgets), 'card')).toHaveLength(6);
  });

  it('keeps bag items that two bags share', () => {
    const item = obj('shared', 'Custom_Token', { CustomImage: { ImageURL: 'https://x/t' } });
    const game = parseTtsSaveFile(
      save([
        obj('b1', 'Bag', { ContainedObjects: [item] }),
        obj('b2', 'Bag', { ContainedObjects: [item] }),
      ]),
    );
    const bags = ofType<BagWidget>(Object.values(game.widgets), 'bag');
    const ids = bags.flatMap((b) => b.itemIds ?? []);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(game.widgets[id]).toBeDefined();
  });

  it('turns a card face down at rotZ 180 and takes the rotation from rotY', () => {
    const game = parseTtsSaveFile(
      save([
        card('up', 100, { rotZ: 0, rotY: 90 }),
        card('down', 101, { rotZ: 180, rotY: 180 }),
        card('nearUp', 102, { rotZ: 359.7 }),
        card('nearDown', 103, { rotZ: 179.9 }),
      ]),
    );
    const w = game.widgets as Record<string, CardWidget>;
    expect([w.up.faceUp, w.up.rotation]).toEqual([true, 90]);
    expect([w.down.faceUp, w.down.rotation]).toEqual([false, 180]);
    expect(w.nearUp.faceUp).toBe(true);
    expect(w.nearDown.faceUp).toBe(false);
  });

  it('imports 3DText as a label and keeps ScriptingTrigger out of the board', () => {
    const game = parseTtsSaveFile(
      save([
        obj('t1', '3DText', { Text: { Text: 'Start here', fontSize: 90 } }),
        obj('z1', 'ScriptingTrigger', { Nickname: 'ScriptingTrigger' }),
      ]),
    );
    const labels = ofType<LabelWidget>(Object.values(game.widgets), 'label');
    expect(labels.map((l) => l.text)).toEqual(['Start here']);
    expect(Object.keys(game.widgets)).not.toContain('z1');
    expect(Object.values(game.widgets).some((w) => w.label === 'ScriptingTrigger')).toBe(false);
    expect(game.scriptZones?.z1).toMatchObject({ id: 'z1' });
  });

  it('numbers seats densely in FogColor order and clamps to maxPlayers', () => {
    const hand = (g: string, c: string) => obj(g, 'HandTrigger', { FogColor: c });
    const sparse = parseTtsSaveFile(
      save([hand('h1', 'Blue'), hand('h2', 'White'), hand('h3', 'Green'), hand('h4', 'Pink')], {
        PlayerCounts: [2, 3],
      }),
    );
    const holders = ofType<HolderWidget>(Object.values(sparse.widgets), 'holder');
    expect(Object.fromEntries(holders.map((h) => [h.id, h.ownerSeat]))).toEqual({
      h2: 0,
      h3: 1,
      h1: 2,
    });
    expect(sparse.maxPlayers).toBe(3);
  });

  it('collects all TabStates and Notecards as rule text', () => {
    const game = parseTtsSaveFile(
      save([obj('n1', 'Notecard', { Nickname: 'Setup', Description: 'Deal 5 cards' })], {
        TabStates: {
          '1': { title: 'Rules', body: 'Rule body', color: 'Grey', id: 1 },
          '2': { title: 'Variants', body: 'Variant body', color: 'Grey', id: 2 },
        },
      }),
    );
    expect(game.ruleText).toContain('Rule body');
    expect(game.ruleText).toContain('Variant body');
    expect(game.ruleText).toContain('Deal 5 cards');
    expect(Object.keys(game.widgets)).toHaveLength(0);
  });

  it('takes the description from Note only', () => {
    expect(parseTtsSaveFile(save([], { Tags: ['a', 'b'] })).description).toBe('');
    expect(parseTtsSaveFile(save([], { Tags: ['a'], Note: 'About' })).description).toBe('About');
  });

  it('uses label keys instead of German literals, in both locales', () => {
    const game = parseTtsSaveFile(
      save([
        card('c', 105),
        obj('d', 'Deck', { DeckIDs: [100], CustomDeck: DECKS }),
        obj('b', 'Custom_Board', { CustomImage: { ImageURL: 'https://x/board' } }),
        obj('h', 'HandTrigger', { FogColor: 'White' }),
        obj('named', 'Custom_Token', { Nickname: 'Mine' }),
      ]),
    );
    const json = JSON.stringify(game.widgets);
    for (const german of ['Karte ', 'Kartenstapel', 'Spielbrett', 'Hand ', 'Ablage']) {
      expect(json).not.toContain(german);
    }
    for (const [lang, locale] of [
      ['de', deLocale],
      ['en', enLocale],
    ] as const) {
      const dict = locale.games.tabletop.labels as Record<string, string>;
      const t = (key: string, o: Record<string, string | number> & { defaultValue?: string }) =>
        (dict[key.split('.').pop() as string] ?? o.defaultValue ?? '').replace(
          /\{\{(\w+)\}\}/g,
          (_, k) => String(o[k]),
        );
      const localized = localizeLabels(game, t).widgets;
      const labels = Object.values(localized).map((w) => w.label);
      expect(labels).toContain(lang === 'de' ? 'Karte 105' : 'Card 105');
      expect(labels).toContain(lang === 'de' ? 'Spielbrett' : 'Board');
      expect(labels).toContain(lang === 'de' ? 'Spieler 1' : 'Player 1');
      expect(labels).toContain('Mine');
    }
  });

  it('shapes snap points as hexes when the tiles are hex tiles', () => {
    const snaps = [{ Position: { x: 1, y: 0, z: 1 } }];
    const flat = parseTtsSaveFile(save([obj('b', 'Custom_Board', { AttachedSnapPoints: snaps })]));
    const hex = parseTtsSaveFile(
      save([
        obj('b', 'Custom_Board', { AttachedSnapPoints: snaps }),
        obj('bag', 'Bag', {
          ContainedObjects: [
            obj('t', 'Custom_Tile', {
              CustomImage: { ImageURL: 'https://x/t', CustomTile: { Type: 1 } },
            }),
          ],
        }),
      ]),
    );
    const snapOf = (g: ReturnType<typeof parseTtsSaveFile>) =>
      ofType<HolderWidget>(Object.values(g.widgets), 'holder')[0];
    expect(snapOf(flat).clipPath).toBeUndefined();
    expect(snapOf(hex).clipPath).toBeDefined();
  });

  it('claims distinct ids for repeated top-level GUIDs of any kind', () => {
    expect(widgetsOf(save([card('x', 100), card('x', 101)]))).toHaveLength(2);
  });
});

import { describe, it, expect } from 'vitest';
import { isTtsSaveFile, parseTtsSaveFile } from '../ttsParser';
import { validateAndSanitizeGame } from '../gameValidator';
import type { TTSObjectState, TTSSaveFile } from '../ttsTypes';
import {
  HEX_CLIP_PATH,
  type CardWidget,
  type DeckWidget,
  type DieWidget,
  type TokenWidget,
  type HolderWidget,
} from '../types';

const obj = (GUID: string, Name: string, fields: Partial<TTSObjectState> = {}): TTSObjectState =>
  ({
    GUID,
    Name,
    Transform: {
      posX: 0,
      posY: 1,
      posZ: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
    },
    ...fields,
  }) as TTSObjectState;

const ugc = (path: string) => `http://cloud-3.steamusercontent.com/ugc/${path}/`;

/** A small hand-made save with every object kind the parser converts. */
const ttsData = {
  SaveName: 'Testspiel',
  PlayerCounts: [2, 10],
  ObjectStates: [
    obj('board', 'Custom_Board', {
      CustomImage: { ImageURL: ugc('1/board'), WidthScale: 1, ImageScalar: 1 },
      AttachedSnapPoints: Array.from({ length: 6 }, (_, i) => ({
        Position: { x: Math.cos(i) * 5, y: 0, z: Math.sin(i) * 5 },
        Tags: ['Feldkarten'],
      })),
    }),
    obj('cards', 'Deck', {
      DeckIDs: Array.from({ length: 12 }, (_, i) => 100 + i),
      CustomDeck: {
        '1': { FaceURL: ugc('1/faces'), BackURL: ugc('1/back'), NumWidth: 10, NumHeight: 7 },
      },
    }),
    obj('hexes', 'Deck', {
      DeckIDs: [200, 201],
      CustomDeck: {
        '2': {
          FaceURL: ugc('2/faces'),
          BackURL: ugc('2/back'),
          NumWidth: 2,
          NumHeight: 1,
          Type: 3,
        },
      },
    }),
    obj('die', 'Die_6'),
    obj('piece', 'backgammon_piece_white'),
    obj('pack', 'PiecePack_Pawn'),
    obj('hand', 'HandTrigger', { FogColor: 'Red' }),
  ],
} as unknown as TTSSaveFile;

describe('ttsParser', () => {
  it('detects TTS save file format correctly', () => {
    expect(isTtsSaveFile(ttsData)).toBe(true);
    expect(isTtsSaveFile({ somethingElse: true })).toBe(false);
    expect(isTtsSaveFile(null)).toBe(false);
  });

  it('parses metadata from the save', () => {
    const game = parseTtsSaveFile(ttsData);
    expect(game.name).toBe('Testspiel');
    expect(game.minPlayers).toBe(2);
    expect(game.maxPlayers).toBe(10);
    expect(game.author).toBe('Steam Workshop');
    expect(game.table.width).toBeGreaterThanOrEqual(1600);
    expect(game.table.height).toBeGreaterThanOrEqual(1000);
  });

  it('sanitizes legacy cloud-3 steam URLs to working akamaihd CDN', () => {
    const game = parseTtsSaveFile(ttsData);
    const widgets = Object.values(game.widgets);

    // No widget should have un-sanitized cloud-3 URLs
    for (const w of widgets) {
      if (w.image) {
        expect(w.image).not.toContain('cloud-3.steamusercontent.com');
      }
      if (w.type === 'card') {
        const card = w as CardWidget;
        expect(card.frontContent.value).not.toContain('cloud-3.steamusercontent.com');
        expect(card.backContent.value).not.toContain('cloud-3.steamusercontent.com');
        if (card.frontContent.spriteSheet?.url) {
          expect(card.frontContent.spriteSheet.url).toContain('steamusercontent-a.akamaihd.net');
        }
      }
    }
  });

  it('converts decks with spritesheet cards', () => {
    const game = parseTtsSaveFile(ttsData);
    const decks = Object.values(game.widgets).filter((w) => w.type === 'deck') as DeckWidget[];

    expect(decks.length).toBeGreaterThan(0);
    const mainDeck = decks.find((d) => d.cardIds.length > 10);
    expect(mainDeck).toBeDefined();

    // Verify cards referenced by the deck exist and have spriteSheet data
    const firstCardId = mainDeck!.cardIds[0];
    const card = game.widgets[firstCardId] as CardWidget;
    expect(card).toBeDefined();
    expect(card.type).toBe('card');
    expect(card.frontContent.type).toBe('image');
    expect(card.frontContent.spriteSheet).toBeDefined();
    expect(card.frontContent.spriteSheet?.numWidth).toBeGreaterThan(0);
    expect(card.frontContent.spriteSheet?.numHeight).toBeGreaterThan(0);
  });

  it('converts dice and tokens', () => {
    const game = parseTtsSaveFile(ttsData);
    const dice = Object.values(game.widgets).filter((w) => w.type === 'die') as DieWidget[];
    expect(dice.length).toBeGreaterThanOrEqual(1);
    expect(dice[0].sides).toBe(6);

    const tokens = Object.values(game.widgets).filter((w) => w.type === 'token') as TokenWidget[];
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('converts HandTriggers into seat-bound holder widgets', () => {
    const game = parseTtsSaveFile(ttsData);
    const hands = Object.values(game.widgets).filter((w) => w.type === 'holder' && w.isHand);
    expect(hands.length).toBeGreaterThan(0);
  });

  it('converts Custom_Board to a pinned rectangular TokenWidget and leaves table felt clean', () => {
    const game = parseTtsSaveFile(ttsData);
    expect(game.table.backgroundImageUrl).toBeUndefined();

    const board = Object.values(game.widgets).find(
      (w) => w.type === 'token' && (w as TokenWidget).shape === 'rectangle' && w.width >= 1000,
    ) as TokenWidget;

    expect(board).toBeDefined();
    expect(board.pinned).toBe(true);
    expect(board.movable).toBe(false);
    expect(board.zIndex).toBe(0);
    // 24.5 TTS units at 50 px per unit
    expect(board.width).toBe(1225);
    expect(board.height).toBe(1225);
    expect(board.image).toContain('steamusercontent-a.akamaihd.net');
  });

  it('keeps a legacy board background as table background with a working CDN URL', () => {
    const validated = validateAndSanitizeGame({
      name: 'Altes Spiel',
      table: { width: 3000, height: 2000, backgroundImageUrl: ugc('1/board') },
      widgets: {},
    });
    expect(validated.table.backgroundImageUrl).toBe(
      'https://steamusercontent-a.akamaihd.net/ugc/1/board/',
    );
  });

  it('converts hex cards (TTS Type 3) to 210x182 px with hexagonal clipPath', () => {
    const game = parseTtsSaveFile(ttsData);
    const hexCards = Object.values(game.widgets).filter(
      (w) => w.type === 'card' && w.clipPath,
    ) as CardWidget[];

    expect(hexCards.length).toBeGreaterThan(0);
    expect(hexCards[0].width).toBe(210);
    expect(hexCards[0].height).toBe(182);
    expect(hexCards[0].clipPath).toBe(HEX_CLIP_PATH);

    // Verify hex deck is also shaped
    const hexDeck = Object.values(game.widgets).find(
      (w) => w.type === 'deck' && w.clipPath,
    ) as DeckWidget;
    expect(hexDeck).toBeDefined();
    expect(hexDeck.width).toBe(210);
    expect(hexDeck.height).toBe(182);
  });

  it('converts AttachedSnapPoints into drop target holders with hex shape and transparent style', () => {
    const game = parseTtsSaveFile(ttsData);
    const snapHolders = Object.values(game.widgets).filter(
      (w) => w.type === 'holder' && w.id.startsWith('snap_'),
    );

    expect(snapHolders.length).toBe(6);
    for (const sh of snapHolders) {
      expect(sh.width).toBe(210);
      expect(sh.height).toBe(182);
      expect(sh.clipPath).toBe(HEX_CLIP_PATH);
      expect(sh.label).toBe('Feldkarten');
      expect((sh as HolderWidget).dropTarget).toBe(true);
      expect((sh as HolderWidget).layout).toBe('stack');
      expect((sh as HolderWidget).pinned).toBe(true);
    }
  });

  it('cleans internal generic names like backgammon_piece from token labels', () => {
    const game = parseTtsSaveFile(ttsData);
    const tokens = Object.values(game.widgets).filter((w) => w.type === 'token');

    for (const t of tokens) {
      if (t.label) {
        expect(t.label.startsWith('backgammon_piece')).toBe(false);
        expect(t.label.startsWith('PiecePack')).toBe(false);
      }
    }
  });

  it('makes a deck with hex cards and all its cards hex-shaped in validateAndSanitizeGame', () => {
    const sanitized = validateAndSanitizeGame({
      name: 'Hex',
      widgets: {
        hex_card: { id: 'hex_card', type: 'card', width: 80, height: 120, clipPath: HEX_CLIP_PATH },
        plain_card: { id: 'plain_card', type: 'card', width: 80, height: 120 },
        deck: {
          id: 'deck',
          type: 'deck',
          width: 80,
          height: 120,
          cardIds: ['hex_card', 'plain_card'],
        },
        other_card: { id: 'other_card', type: 'card', width: 80, height: 120 },
      },
    });

    for (const id of ['deck', 'hex_card', 'plain_card']) {
      const w = sanitized.widgets[id] as CardWidget | DeckWidget;
      expect(w.width).toBe(210);
      expect(w.height).toBe(182);
      expect(w.clipPath).toBe(HEX_CLIP_PATH);
    }
    expect(sanitized.widgets.other_card.clipPath).toBeUndefined();
    expect(sanitized.widgets.other_card.width).toBe(80);
  });
});

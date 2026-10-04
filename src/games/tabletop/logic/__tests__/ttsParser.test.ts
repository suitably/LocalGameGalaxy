import { describe, it, expect } from 'vitest';
import sampleJson from '../../tabletopsimulator/2500271578.json';
import { isTtsSaveFile, parseTtsSaveFile } from '../ttsParser';
import { validateAndSanitizeGame } from '../gameValidator';
import type { TTSSaveFile } from '../ttsTypes';
import { HEX_CLIP_PATH, type CardWidget, type DeckWidget, type DieWidget, type TokenWidget, type HolderWidget } from '../types';

describe('ttsParser', () => {
  const ttsData = sampleJson as unknown as TTSSaveFile;

  it('detects TTS save file format correctly', () => {
    expect(isTtsSaveFile(ttsData)).toBe(true);
    expect(isTtsSaveFile({ somethingElse: true })).toBe(false);
    expect(isTtsSaveFile(null)).toBe(false);
  });

  it('parses metadata from Rick and Morty sample', () => {
    const game = parseTtsSaveFile(ttsData);
    expect(game.name).toBe('Rick and Morty 100 Tage');
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
    const decks = Object.values(game.widgets).filter(
      (w) => w.type === 'deck',
    ) as DeckWidget[];

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
    const dice = Object.values(game.widgets).filter(
      (w) => w.type === 'die',
    ) as DieWidget[];
    expect(dice.length).toBeGreaterThanOrEqual(1);
    expect(dice[0].sides).toBe(6);

    const tokens = Object.values(game.widgets).filter(
      (w) => w.type === 'token',
    ) as TokenWidget[];
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('converts HandTriggers into seat-bound holder widgets', () => {
    const game = parseTtsSaveFile(ttsData);
    const hands = Object.values(game.widgets).filter(
      (w) => w.type === 'holder' && w.isHand,
    );
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
    expect(board.width).toBe(1275);
    expect(board.height).toBe(1225);
    expect(board.image).toContain('steamusercontent-a.akamaihd.net');
  });

  it('migrates legacy games with backgroundImageUrl to a board TokenWidget in validateAndSanitizeGame', () => {
    const legacyGame = {
      name: 'Legacy Rick and Morty',
      author: 'Steam Workshop',
      table: {
        width: 3000,
        height: 2000,
        backgroundImageUrl: 'http://cloud-3.steamusercontent.com/ugc/1752432457657315071/4CA2BC0FD0D8483D003FC39203118B9C5B3A5A88/',
      },
      widgets: {},
    };

    const validated = validateAndSanitizeGame(legacyGame);
    // Even when passing through validateAndSanitizeGame directly:
    expect(validated.table.backgroundImageUrl).toBeUndefined();
    const board = Object.values(validated.widgets).find(
      (w) => w.type === 'token' && (w as TokenWidget).shape === 'rectangle',
    ) as TokenWidget;
    expect(board).toBeDefined();
    expect(board.width).toBe(1275);
    expect(board.height).toBe(1225);
    expect(board.image).toContain('steamusercontent-a.akamaihd.net');
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

  it('migrates existing saves in validateAndSanitizeGame to add hex shape, clean token labels, and add snap holders', () => {
    const unmigratedGame = {
      name: 'Rick and Morty 100 Tage',
      table: { width: 2000, height: 1600 },
      widgets: {
        migrated_board: {
          id: 'migrated_board',
          type: 'token' as const,
          shape: 'rectangle' as const,
          x: 400,
          y: 200,
          width: 1275,
          height: 1225,
          image: 'https://steamusercontent-a.akamaihd.net/ugc/1752432457657315071/4CA2BC0FD0D8483D003FC39203118B9C5B3A5A88/',
        },
        hex_card_1: {
          id: 'hex_card_1',
          type: 'card' as const,
          width: 80,
          height: 120,
          frontContent: {
            type: 'image' as const,
            value: 'https://steamusercontent-a.akamaihd.net/ugc/1752432457657352341/B8E2540B64D0AA1B8ED447707E09019A07CFDA6A/',
          },
          backContent: {
            type: 'image' as const,
            value: 'https://steamusercontent-a.akamaihd.net/ugc/1752432457657319703/B3D051B76921548648B589CF8A62585AE37116D0/',
          },
        },
        generic_token_1: {
          id: 'generic_token_1',
          type: 'token' as const,
          label: 'backgammon_piece_white',
        },
        old_deck: {
          id: 'old_deck',
          type: 'deck' as const,
          width: 80,
          height: 120,
          cardIds: ['hex_card_1'],
          backContent: {
            type: 'image' as const,
            value: 'https://steamusercontent-a.akamaihd.net/ugc/legacy_wrong_back/',
          },
        },
      },
    };

    const sanitized = validateAndSanitizeGame(unmigratedGame);

    // Card should now be hex and have hex back
    const card = sanitized.widgets.hex_card_1 as CardWidget;
    expect(card.width).toBe(210);
    expect(card.height).toBe(182);
    expect(card.clipPath).toBe(HEX_CLIP_PATH);
    expect(card.backContent.value).toContain('B3D051B76921548648B589CF8A62585AE37116D0');

    // Deck containing hex card should now be hex and have hex back
    const deck = sanitized.widgets.old_deck as DeckWidget;
    expect(deck.width).toBe(210);
    expect(deck.height).toBe(182);
    expect(deck.clipPath).toBe(HEX_CLIP_PATH);
    expect(deck.backContent?.value).toContain('B3D051B76921548648B589CF8A62585AE37116D0');

    // Token label should be cleared
    const token = sanitized.widgets.generic_token_1 as TokenWidget;
    expect(token.label).toBeUndefined();

    // Snap holders should be generated for the board
    const snaps = Object.values(sanitized.widgets).filter((w) => w.id.startsWith('snap_'));
    expect(snaps.length).toBe(6);
    expect(snaps[0].width).toBe(210);
    expect(snaps[0].height).toBe(182);
    expect(snaps[0].clipPath).toBe(HEX_CLIP_PATH);
  });
});

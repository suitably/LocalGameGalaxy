import { describe, it, expect } from 'vitest';
import { parsePcioFile } from '../pcioParser';
import { validateAndSanitizeGame } from '../gameValidator';
import { resolveAssetUrl } from '../pcioAssetUtils';
import type { HolderWidget, CardWidget, DeckWidget, TokenWidget } from '../types';
import { zipSync, strToU8 } from 'fflate';

describe('Tabletop pcioParser', () => {
  it('parses valid JSON game definitions', async () => {
    const rawJson = JSON.stringify({
      name: 'Mau-Mau Test',
      author: 'Tester',
      minPlayers: 2,
      maxPlayers: 5,
      widgets: {
        deck1: {
          id: 'deck1',
          type: 'deck',
          x: 400,
          y: 300,
          cardIds: ['c1', 'c2'],
        },
        hand1: {
          id: 'hand1',
          type: 'cardhand',
          x: 100,
          y: 700,
          seat: 0,
          childIds: ['c1'],
        },
      },
    });

    const result = await parsePcioFile(rawJson);
    expect(result.name).toBe('Mau-Mau Test');
    expect(result.author).toBe('Tester');
    expect(result.widgets.deck1.type).toBe('deck');
    expect(result.widgets.hand1.type).toBe('holder');
    expect(result.widgets.hand1.ownerSeat).toBe(0);
    expect(result.supportedModes).toContain('party_multi_device');
  });

  it('unpacks and normalizes a zipped .pcio archive', async () => {
    const templateContent = JSON.stringify({
      name: 'Zipped Game',
      widgets: {
        discard: {
          id: 'discard',
          type: 'holder',
          dropTarget: true,
          childIds: [],
        },
      },
    });

    const zipBytes = zipSync({
      'template.json': strToU8(templateContent),
      'card.png': new Uint8Array([137, 80, 78, 71]), // dummy png header
    });

    const result = await parsePcioFile(zipBytes.buffer);
    expect(result.name).toBe('Zipped Game');
    expect((result.widgets.discard as HolderWidget).dropTarget).toBe(true);
    expect(result.assetFiles?.['card.png']).toBeDefined();
    expect(result.assetFiles?.['card.png']).toContain('data:image/png;base64,');
  });

  it('maps assetFiles to card faces, backs, and table background', async () => {
    const templateContent = JSON.stringify({
      name: 'Asset Game',
      table: {
        background: 'assets/felt.png',
      },
      widgets: {
        ace: {
          id: 'ace',
          type: 'card',
          frontImage: 'card_ace.png',
          backImage: 'card_back.png',
        },
      },
    });

    const zipBytes = zipSync({
      'template.json': strToU8(templateContent),
      'assets/felt.png': new Uint8Array([137, 80, 78, 71]),
      'card_ace.png': new Uint8Array([137, 80, 78, 71]),
      'card_back.png': new Uint8Array([137, 80, 78, 71]),
    });

    const result = await parsePcioFile(zipBytes.buffer);
    expect(result.table.backgroundImageUrl).toContain('data:image/png;base64,');
    const ace = result.widgets.ace as CardWidget;
    expect(ace.frontContent?.type).toBe('image');
    expect(ace.frontContent?.value).toContain('data:image/png;base64,');
    expect(ace.backContent?.type).toBe('image');
    expect(ace.backContent?.value).toContain('data:image/png;base64,');
  });

  it('parses flat PlayingCards.io room states with deck cardTypes', async () => {
    const flatRoomState = JSON.stringify({
      deck1: {
        id: 'deck1',
        type: 'deck',
        cardTypes: {
          Ore: { image: '/assets/ore.png' },
        },
      },
      c1: {
        id: 'c1',
        type: 'card',
        deck: 'deck1',
        cardType: 'Ore',
      },
    });

    const result = await parsePcioFile(flatRoomState, {
      assetFiles: {
        'ore.png': 'data:image/png;base64,mockore',
      },
      defaultName: 'Frontiers Test',
    });

    expect(result.name).toBe('Frontiers Test');
    expect(result.widgets.deck1).toBeDefined();
    const c1 = result.widgets.c1 as CardWidget;
    expect(c1).toBeDefined();
    expect(c1.frontContent?.type).toBe('image');
    expect(c1.frontContent?.value).toBe('data:image/png;base64,mockore');
    const deck1 = result.widgets.deck1 as DeckWidget;
    expect(deck1.cardIds).toContain('c1');
  });

  it('sanitizes missing IDs, invalid bounds and sets sensible defaults', () => {
    const sanitized = validateAndSanitizeGame({
      name: '',
      minPlayers: -5,
      widgets: {
        w1: { id: '', type: 'card', x: -10, y: -10 } as unknown as CardWidget,
      },
    });

    expect(sanitized.name).toBe('Unbenanntes Spiel');
    expect(sanitized.minPlayers).toBe(1);
    expect(sanitized.table.width).toBeGreaterThanOrEqual(1600);
    expect(sanitized.widgets.w1.id).toBe('w1');

    const sanitizedWithDeck = validateAndSanitizeGame({
      name: 'Deck Test',
      widgets: {
        normalDeck: { id: 'normalDeck', type: 'deck' } as unknown as DeckWidget,
        explicitOpenDeck: { id: 'explicitOpenDeck', type: 'deck', faceUp: true } as unknown as DeckWidget,
      },
    });
    expect((sanitizedWithDeck.widgets.normalDeck as DeckWidget).faceUp).toBe(false);
    expect((sanitizedWithDeck.widgets.normalDeck as DeckWidget).activeFace).toBe(0);
    expect((sanitizedWithDeck.widgets.explicitOpenDeck as DeckWidget).faceUp).toBe(true);
    expect((sanitizedWithDeck.widgets.explicitOpenDeck as DeckWidget).activeFace).toBe(1);
  });

  it('extracts ruleText from info object or root properties', async () => {
    const rawJson = JSON.stringify({
      name: 'Rules Test',
      info: {
        ruleText: '<h1>Rules of the Game</h1><p>Roll dice to win.</p>',
      },
      widgets: {
        w1: { id: 'w1', type: 'card', x: 0, y: 0 },
      },
    });

    const result = await parsePcioFile(rawJson);
    expect(result.ruleText).toBe('<h1>Rules of the Game</h1><p>Roll dice to win.</p>');
  });

  it('resolves bare filenames to /assets/ path and handles root-relative URLs', () => {
    expect(resolveAssetUrl('wood.png')).toBe('/assets/wood.png');
    expect(resolveAssetUrl('/assets/brick.png')).toBe('/assets/brick.png');
    expect(resolveAssetUrl('assets/sheep.png')).toBe('/assets/sheep.png');
    expect(resolveAssetUrl('https://example.com/ore.png')).toBe('https://example.com/ore.png');
  });

  it('resolves inherited rotation for tokens', async () => {
    const rawJson = JSON.stringify({
      name: 'Rotation Test',
      widgets: {
        roadProto: {
          id: 'roadProto',
          rotation: 60,
        },
        road1: {
          id: 'road1',
          type: 'token',
          inheritFrom: 'roadProto',
          x: 10,
          y: 20,
        },
      },
    });

    const result = await parsePcioFile(rawJson);
    const road = result.widgets.road1 as TokenWidget;
    expect(road).toBeDefined();
    expect(road.rotation).toBe(60);
  });

  it('normalizes draw piles to face-down and open resource piles to face-up', async () => {
    const rawJson = JSON.stringify({
      name: 'Pile FaceUp Test',
      widgets: {
        deck1: {
          id: 'deck1',
          type: 'deck',
          cardDefaults: {
            image: '/assets/card_back.png',
          },
        },
        drawPile: {
          id: 'drawPile',
          type: 'pile',
          label: 'Ziehstapel',
          deck: 'deck1',
        },
        openResourcePile: {
          id: 'openResourcePile',
          type: 'pile',
          label: 'Holz',
          deck: 'deck1',
        },
        card1: {
          id: 'card1',
          type: 'card',
          parent: 'drawPile',
          frontImage: '/assets/draw_front.png',
          backImage: '/assets/card_back.png',
          faceUp: false,
        },
        card2: {
          id: 'card2',
          type: 'card',
          parent: 'openResourcePile',
          frontImage: '/assets/wood.png',
          backImage: '/assets/card_back.png',
          faceUp: true,
        },
      },
    });

    const result = await parsePcioFile(rawJson);
    const drawDeck = result.widgets.drawPile as DeckWidget;
    const resourceDeck = result.widgets.openResourcePile as DeckWidget;

    expect(drawDeck).toBeDefined();
    expect(drawDeck.faceUp).toBe(false);
    expect(drawDeck.activeFace).toBe(0);

    expect(resourceDeck).toBeDefined();
    expect(resourceDeck.faceUp).toBe(true);
    expect(resourceDeck.activeFace).toBe(1);
  });
});


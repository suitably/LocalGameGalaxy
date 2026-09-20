import { describe, it, expect } from 'vitest';
import { normalizePcioWidgets } from '../pcioNormalizer';
import type { CardWidget, DeckWidget, HolderWidget, TokenWidget } from '../types';

describe('VirtualTabletop / Frontiers Normalization', () => {
  it('filters out hidden widgets and their descendants', () => {
    const rawWidgets: Record<string, Record<string, unknown>> = {
      'Switch Board': {
        id: 'Switch Board',
        width: 1600,
        height: 1000,
        display: false,
      },
      'Card Template': {
        id: 'Card Template',
        type: 'card',
        parent: 'Switch Board',
      },
      'Base Map Button': {
        id: 'Base Map Button',
        type: 'button',
        parent: 'Switch Board',
      },
      'Real Tile': {
        id: 'Real Tile',
        type: 'card',
        x: 100,
        y: 100,
      },
    };

    const normalized = normalizePcioWidgets(rawWidgets);
    expect(normalized['Switch Board']).toBeUndefined();
    expect(normalized['Card Template']).toBeUndefined();
    expect(normalized['Base Map Button']).toBeUndefined();
    expect(normalized['Real Tile']).toBeDefined();
  });

  it('inherits width, height, and clipPath from deck cardDefaults and faceTemplates', () => {
    const rawWidgets: Record<string, Record<string, unknown>> = {
      'Tiles Real': {
        id: 'Tiles Real',
        type: 'deck',
        cardDefaults: {
          width: 173.20508075700002,
          height: 200,
        },
        cardTypes: {
          W: { image: '/assets/wheat.jpg' },
        },
        faceTemplates: [
          {},
          {
            objects: [
              {
                type: 'image',
                css: 'clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              },
            ],
          },
        ],
      },
      '8koj': {
        id: '8koj',
        type: 'card',
        deck: 'Tiles Real',
        cardType: 'W',
        x: 540.19,
        y: 100,
      },
    };

    const normalized = normalizePcioWidgets(rawWidgets, {
      '/assets/wheat.jpg': 'blob:wheat-url',
    });

    const tile = normalized['8koj'] as CardWidget;
    expect(tile).toBeDefined();
    expect(tile.width).toBeCloseTo(173.205, 2);
    expect(tile.height).toBe(200);
    expect(tile.clipPath).toBe('polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)');
    expect(tile.frontContent.value).toBe('blob:wheat-url');
  });

  it('converts Chips cards into circular number tokens with dots and custom color', () => {
    const rawWidgets: Record<string, Record<string, unknown>> = {
      Chips: {
        id: 'Chips',
        type: 'deck',
        cardDefaults: {
          width: 60,
          height: 60,
          background: '#ECCCA0',
        },
        cardTypes: {
          '6': {
            number: '6',
            dots: '.....',
            css: 'color: red',
          },
          '4': {
            number: '4',
            dots: '...',
          },
        },
      },
      '3eqw': {
        id: '3eqw',
        type: 'card',
        deck: 'Chips',
        cardType: '6',
        x: 770,
        y: 170,
      },
      '2odx': {
        id: '2odx',
        type: 'card',
        deck: 'Chips',
        cardType: '4',
        x: 943,
        y: 170,
      },
    };

    const normalized = normalizePcioWidgets(rawWidgets);

    const chip6 = normalized['3eqw'] as TokenWidget;
    expect(chip6.type).toBe('token');
    expect(chip6.shape).toBe('circle');
    expect(chip6.label).toBe('6');
    expect(chip6.subText).toBe('.....');
    expect(chip6.textColor).toBe('#dc2626');
    expect(chip6.color).toBe('#ECCCA0');
    expect(chip6.width).toBe(60);

    const chip4 = normalized['2odx'] as TokenWidget;
    expect(chip4.label).toBe('4');
    expect(chip4.subText).toBe('...');
    expect(chip4.textColor).toBe('#3e2723');
  });

  it('groups child cards in piles into stacked deck widgets with count and top face', () => {
    const rawWidgets: Record<string, Record<string, unknown>> = {
      Resources: {
        id: 'Resources',
        type: 'deck',
        cardTypes: {
          Wood: { image: '/assets/wood.png' },
        },
      },
      Wood: {
        id: 'Wood',
        type: 'holder',
        x: 1395,
        y: 412,
        width: 88,
        height: 128,
      },
      f1uy: {
        id: 'f1uy',
        type: 'pile',
        parent: 'Wood',
      },
      card1: {
        id: 'card1',
        type: 'card',
        deck: 'Resources',
        cardType: 'Wood',
        parent: 'f1uy',
      },
      card2: {
        id: 'card2',
        type: 'card',
        deck: 'Resources',
        cardType: 'Wood',
        parent: 'f1uy',
      },
    };

    const normalized = normalizePcioWidgets(rawWidgets, {
      '/assets/wood.png': 'blob:wood-url',
    });

    const pile = normalized.f1uy as DeckWidget;
    expect(pile).toBeDefined();
    expect(pile.type).toBe('deck');
    expect(pile.isPile).toBe(true);
    expect(pile.cardCount).toBe(2);
    expect(pile.x).toBe(1395);
    expect(pile.y).toBe(412);
    expect(pile.frontContent?.value).toBe('blob:wood-url');

    const card1 = normalized.card1 as CardWidget;
    expect(card1.inPile).toBe(true);
    expect(card1.pileId).toBe('f1uy');
  });

  it('supports image and rotation on Holder and Token widgets', () => {
    const rawWidgets: Record<string, Record<string, unknown>> = {
      'Exchange Rates': {
        id: 'Exchange Rates',
        type: 'holder',
        x: 1341,
        y: 80.75,
        width: 260,
        height: 322.5,
        image: '/assets/exchange.png',
        rotation: -5,
      },
      Robber: {
        id: 'Robber',
        type: 'token',
        x: 755,
        y: 455,
        width: 90,
        height: 90,
        image: '/assets/robber.svg',
      },
    };

    const normalized = normalizePcioWidgets(rawWidgets, {
      '/assets/exchange.png': 'blob:exchange-url',
      '/assets/robber.svg': 'blob:robber-url',
    });

    const er = normalized['Exchange Rates'] as HolderWidget;
    expect(er.image).toBe('blob:exchange-url');
    expect(er.rotation).toBe(-5);

    const robber = normalized.Robber as TokenWidget;
    expect(robber.image).toBe('blob:robber-url');
  });

  it('does not clip Harbors cards and respects layer z-indexing and grid definitions', () => {
    const rawWidgets: Record<string, Record<string, unknown>> = {
      Harbors: {
        id: 'Harbors',
        type: 'deck',
        cardDefaults: {
          width: 173.2,
          height: 200,
          layer: -5,
          movable: false,
        },
        faceTemplates: [
          {},
          {
            objects: [
              {
                type: 'image',
                color: 'transparent',
                css: 'clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              },
              {
                type: 'image',
                css: 'background-size: 50%',
                dynamicProperties: { value: 'image' },
                rotation: 90,
              },
            ],
          },
        ],
      },
      harbor1: {
        id: 'harbor1',
        type: 'card',
        deck: 'Harbors',
        x: 100,
        y: 100,
      },
      'Die 1': {
        id: 'Die 1',
        type: 'dice',
        layer: 5,
        z: 1,
        x: 1420,
        y: 9,
      },
      Robber: {
        id: 'Robber',
        type: 'token',
        x: 755,
        y: 455,
        grid: [{ x: 173.2, y: 300, offsetX: -24.4, offsetY: 5 }],
      },
    };

    const normalized = normalizePcioWidgets(rawWidgets);

    const harbor = normalized.harbor1 as CardWidget;
    expect(harbor.clipPath).toBeUndefined();
    expect(harbor.pinned).toBe(true);
    expect(harbor.zIndex).toBeLessThan(1000000); // Layer -5 -> 500001

    const die = normalized['Die 1'];
    expect(die.type).toBe('die');
    expect(die.zIndex).toBeGreaterThanOrEqual(1500000); // Layer 5 -> 1500001
    expect(die.pinned).toBe(true);

    const robber = normalized.Robber as TokenWidget;
    expect(robber.pinned).toBe(false);
    expect(robber.grid).toBeDefined();
    expect(Array.isArray(robber.grid)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import sampleJson from '../../tabletopsimulator/2500271578.json';
import { isTtsSaveFile, parseTtsSaveFile } from '../ttsParser';
import type { TTSSaveFile } from '../ttsTypes';
import type { CardWidget, DeckWidget, DieWidget, TokenWidget } from '../types';

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
});

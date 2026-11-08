import { describe, expect, it } from 'vitest';
import { decksToShuffleOnStart } from '../startShuffle';
import type { TabletopGameDefinition, TabletopWidget } from '../types';

const deck = (id: string, cardIds: string[], shuffleOnStart?: boolean) =>
  ({
    id,
    type: 'deck',
    x: 0,
    y: 0,
    width: 80,
    height: 120,
    zIndex: 1,
    cardIds,
    backContent: { type: 'color', value: '#000' },
    shuffleOnStart,
  }) as unknown as TabletopWidget;

const game = (widgets: TabletopWidget[]) =>
  ({
    id: 'g',
    name: 'G',
    widgets: Object.fromEntries(widgets.map((w) => [w.id, w])),
  }) as unknown as TabletopGameDefinition;

describe('decksToShuffleOnStart', () => {
  const g = game([deck('a', ['1', '2'], true), deck('b', ['1', '2']), deck('c', ['1'], true)]);

  it('returns flagged decks with more than one card for a fresh game', () => {
    expect(decksToShuffleOnStart(g, 'original')).toEqual(['a']);
    expect(decksToShuffleOnStart(g, 'template')).toEqual(['a']);
  });

  it('keeps a resumed session in order', () => {
    expect(decksToShuffleOnStart(g, 'session')).toEqual([]);
  });
});

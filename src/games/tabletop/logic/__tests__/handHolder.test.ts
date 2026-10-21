import { describe, it, expect } from 'vitest';
import { isHandHolder, looksLikeHandHolder, normalizeHandHolders } from '../handHolder';
import {
  isPersonalHolder,
  isSeatArea,
  findPlayerHandHolder,
  filterBoardHolders,
} from '../boardFilter';
import { tabletopReducer } from '../tabletopReducer';
import type { HolderWidget, TabletopGameDefinition, TabletopWidget } from '../types';

const holder = (fields: Partial<HolderWidget> & { id: string }): HolderWidget =>
  ({
    type: 'holder',
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    zIndex: 1,
    dropTargetTypes: ['card'],
    childIds: [],
    layout: 'stack',
    ...fields,
  }) as HolderWidget;

describe('hand holder rule (#410)', () => {
  it.each([
    ['hand', true],
    ['Hand', true],
    ['p1_hand', true],
    ['hand_p2', true],
    ['Player 1 - Hand', true],
    ['player 2 cards hand', true],
    ['Spieler 3 Hand', true],
    ['myhand', true],
    ['handout_pile', false],
    ['handpile', false],
    ['discard', false],
    ['p2_area', false],
  ])('classifies id %j without isHand flag as hand=%s', (id, expected) => {
    expect(looksLikeHandHolder({ id })).toBe(expected);
    expect(isHandHolder(holder({ id }))).toBe(expected);
  });

  it('uses the label as fallback', () => {
    expect(isHandHolder(holder({ id: 'zone7', label: 'Handkarten' }))).toBe(true);
  });

  it('an explicit isHand flag always wins over the name', () => {
    expect(isHandHolder(holder({ id: 'p1_hand', isHand: false }))).toBe(false);
    expect(isHandHolder(holder({ id: 'zone7', isHand: true }))).toBe(true);
  });

  it('divergence 1: a seat-owned area is personal but not a hand', () => {
    const area = holder({ id: 'p2_area', ownerSeat: 2 });
    expect(isHandHolder(area)).toBe(false);
    expect(isSeatArea(area)).toBe(true);
    expect(isPersonalHolder(area)).toBe(true);
    expect(filterBoardHolders({ p2_area: area }, new Set(['p2_area']))).toEqual([]);
    expect(findPlayerHandHolder({ p2_area: area }, 2)).toBeUndefined();
  });

  it('divergence 2: an id that merely contains "hand" is not a hand', () => {
    const pile = holder({ id: 'handout_pile' });
    expect(isHandHolder(pile)).toBe(false);
    expect(isPersonalHolder(pile)).toBe(false);
    expect(filterBoardHolders({ handout_pile: pile }, new Set(['handout_pile']))).toEqual([pile]);
  });

  it('named player areas are seat areas, supply reserves are not', () => {
    expect(isSeatArea(holder({ id: 'Spielerbereich 1' }))).toBe(true);
    expect(isSeatArea(holder({ id: 'x', label: 'Player Area' }))).toBe(true);
    expect(isSeatArea(holder({ id: 'Player 1 - Roads', ownerSeat: 1 }))).toBe(false);
  });

  it('finds the seat hand by ownerSeat and ignores seat areas', () => {
    const widgets: Record<string, TabletopWidget> = {
      area: holder({ id: 'area', ownerSeat: 1 }),
      hand: holder({ id: 'h1', isHand: true, ownerSeat: 1 }),
    };
    expect(findPlayerHandHolder(widgets, 1)?.id).toBe('h1');
  });
});

describe('normalizeHandHolders', () => {
  const game = (widgets: Record<string, TabletopWidget>) =>
    ({ id: 'g', name: 'g', widgets }) as unknown as TabletopGameDefinition;

  it('writes isHand for holders without the flag and keeps explicit flags', () => {
    const result = normalizeHandHolders(
      game({
        a: holder({ id: 'p1_hand' }),
        b: holder({ id: 'discard' }),
        c: holder({ id: 'p2_hand', isHand: false }),
      }),
    );
    expect((result.widgets.a as HolderWidget).isHand).toBe(true);
    expect((result.widgets.b as HolderWidget).isHand).toBe(false);
    expect((result.widgets.c as HolderWidget).isHand).toBe(false);
  });

  it('returns the same object when every holder is already classified', () => {
    const input = game({ a: holder({ id: 'hand', isHand: true }) });
    expect(normalizeHandHolders(input)).toBe(input);
  });

  it('runs on LOAD_GAME so synced state carries explicit flags', () => {
    const state = tabletopReducer({ game: game({}), flyingCards: [] } as never, {
      type: 'LOAD_GAME',
      payload: game({ a: holder({ id: 'Player 1 - Hand' }) }),
    });
    expect((state.game.widgets.a as HolderWidget).isHand).toBe(true);
  });
});

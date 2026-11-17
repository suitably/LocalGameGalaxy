import { describe, it, expect } from 'vitest';
import { createGame } from './engine';
import { isCardVisible } from './visibility';
import { run, scenario } from './testFixtures';

describe('isCardVisible', () => {
  it('hides every hand card in classic play outside a peek', () => {
    const state = scenario();
    for (const slot of [0, 1, 2, 3]) {
      expect(isCardVisible(state, 'p1', 'p1', slot)).toBe(false);
      expect(isCardVisible(state, 'p1', 'p2', slot)).toBe(false);
    }
  });

  it('shows only the own bottom two during the start peek', () => {
    const state = scenario();
    expect([0, 1, 2, 3].map((s) => isCardVisible(state, 'p1', 'p1', s, true))).toEqual([
      false,
      false,
      true,
      true,
    ]);
    expect(isCardVisible(state, 'p1', 'p2', 2, true)).toBe(false);
  });

  it('shows a peeked opponent card to the current player only, during reveal', () => {
    const state = run(
      scenario(),
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
      { type: 'skip_power' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
      { type: 'power_peek_other', targetId: 'p2', slot: 2 },
    );
    expect(isCardVisible(state, 'p1', 'p2', 2)).toBe(true);
    expect(isCardVisible(state, 'p2', 'p2', 2)).toBe(false);
    expect(isCardVisible(run(state, { type: 'end_turn' }), 'p1', 'p2', 2)).toBe(false);
  });

  it('keeps seen cards visible to their viewer with the memory aid', () => {
    const state = createGame(['Ann', 'Ben'], { memoryAid: true });
    expect(isCardVisible(state, 'p1', 'p1', 2)).toBe(true);
    expect(isCardVisible(state, 'p1', 'p1', 0)).toBe(false);
    expect(isCardVisible(state, 'p2', 'p1', 2)).toBe(false);
  });
});

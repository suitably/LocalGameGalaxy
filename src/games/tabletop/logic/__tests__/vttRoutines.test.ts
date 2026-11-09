import { describe, it, expect } from 'vitest';
import { vttClickRoutine } from '../vttRoutines';
import { normalizePcioWidgets } from '../pcioNormalizer';
import { tabletopReducer } from '../tabletopReducer';
import type { ButtonWidget, DeckWidget, HolderWidget } from '../types';
import { table } from './routineFixture';

describe('VTT/PCIO clickRoutine mapping (#694, Q15 part 1)', () => {
  it('maps the trivial subset', () => {
    expect(
      vttClickRoutine([
        { func: 'SHUFFLE', holder: 'pile' },
        { func: 'MOVE', from: 'pile', to: 'hand', count: 3 },
        { func: 'ROLL', collection: ['d1', 'd2'] },
        { func: 'FLIP', collection: ['c1'] },
        { func: 'TIMER', timer: 't', mode: 'reset' },
      ]),
    ).toEqual([
      { op: 'SHUFFLE', deck: 'pile' },
      { op: 'DRAW', deck: 'pile', count: 3, to: 'hand' },
      { op: 'ROLL', dice: ['d1', 'd2'] },
      { op: 'FLIP', cards: ['c1'] },
      { op: 'TIMER', timer: 't', action: 'reset' },
    ]);
  });

  it('leaves the whole routine out when one step is not in the subset', () => {
    expect(
      vttClickRoutine([
        { func: 'SHUFFLE', holder: 'p' },
        { func: 'SELECT', type: 'card' },
      ]),
    ).toEqual([]);
    expect(vttClickRoutine([{ func: 'ROLL', collection: 'DEFAULT' }])).toEqual([]);
    expect(vttClickRoutine([{ func: 'MOVE', from: 'a', to: 'b', count: 'all' }])).toEqual([]);
    expect(vttClickRoutine(['var x = 1'])).toEqual([]);
    expect(vttClickRoutine(undefined)).toEqual([]);
  });

  it('an imported button shuffles and deals from a VTT holder with a pile', () => {
    const widgets = normalizePcioWidgets({
      stack: { type: 'holder', x: 0, y: 0, width: 110, height: 160 },
      pile: { type: 'pile', parent: 'stack', x: 0, y: 0 },
      c1: { type: 'card', parent: 'pile', x: 0, y: 0 },
      c2: { type: 'card', parent: 'pile', x: 0, y: 0 },
      tray: { type: 'holder', x: 300, y: 0, width: 200, height: 160 },
      deal: {
        type: 'button',
        x: 0,
        y: 300,
        clickRoutine: [
          { func: 'SHUFFLE', holder: 'stack' },
          { func: 'MOVE', from: 'stack', to: 'tray', count: 1 },
        ],
      },
    });
    expect((widgets.deal as ButtonWidget).routine).toHaveLength(2);
    const state = table(Object.values(widgets));
    const next = tabletopReducer(state, {
      type: 'RUN_ROUTINE',
      payload: { buttonId: 'deal', now: 0 },
    });
    const pileId = Object.values(next.game.widgets).find((w) => w.type === 'deck')!.id;
    expect((next.game.widgets[pileId] as DeckWidget).cardIds).toHaveLength(1);
    expect((next.game.widgets.tray as HolderWidget).childIds).toHaveLength(1);
  });
});

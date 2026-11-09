import { describe, it, expect } from 'vitest';
import { tabletopReducer } from '../tabletopReducer';
import { parseRoutine } from '../routines';
import type {
  ButtonWidget,
  DeckWidget,
  DieWidget,
  HolderWidget,
  TabletopGameDefinition,
} from '../types';
import { run } from './routineFixture';

// `fs` is polyfilled in tests (vite-plugin-node-polyfills); Vite loads the built-in starters.
const STARTERS = import.meta.glob('/public/games/tabletop/*.json', {
  eager: true,
  import: 'default',
});
/** A fresh copy of a built-in starter, as the app loads it. */
const starter = (file: string): TabletopGameDefinition =>
  structuredClone(STARTERS[`/public/games/tabletop/${file}`]) as TabletopGameDefinition;
const stateOf = (game: TabletopGameDefinition) =>
  tabletopReducer({ game, flyingCards: [] }, { type: 'LOAD_GAME', payload: game });
const buttons = (game: TabletopGameDefinition) =>
  Object.values(game.widgets).filter((w): w is ButtonWidget => w.type === 'button');

describe('starter games express their setup as routines (#694)', () => {
  it('every starter button routine is valid', () => {
    for (const file of ['standard-cards.json', 'liars-dice.json']) {
      const list = buttons(starter(file));
      expect(list.length).toBeGreaterThan(0);
      for (const b of list) expect(parseRoutine(b.routine)).toMatchObject({ ok: true });
    }
  });

  it('standard cards: shuffle & deal 5 fills every hand, next turn moves the turn', () => {
    const state = stateOf(starter('standard-cards.json'));
    const dealt = tabletopReducer(state, run('deal_hands'));
    for (const id of ['hand_p0', 'hand_p1', 'hand_p2', 'hand_p3']) {
      expect((dealt.game.widgets[id] as HolderWidget).childIds).toHaveLength(5);
    }
    expect((dealt.game.widgets.deck1 as DeckWidget).cardIds).toHaveLength(32);
    const turned = tabletopReducer(dealt, run('next_turn'));
    expect(turned.game.widgets.seat_auto_0).toMatchObject({ type: 'seat', turn: true });
  });

  it("Liar's Dice: roll my cup rolls only the caller's dice; new round rolls all", () => {
    const state = stateOf(starter('liars-dice.json'));
    const values = (s: typeof state, prefix: string) =>
      Object.values(s.game.widgets)
        .filter((w) => w.type === 'die' && w.id.startsWith(prefix))
        .map((w) => (w as DieWidget).currentValue);
    const mine = tabletopReducer(state, run('roll_my_cup', 2, 99));
    expect(values(mine, 'd2_')).not.toEqual(values(state, 'd2_'));
    for (const other of ['d0_', 'd1_', 'd3_']) {
      expect(values(mine, other)).toEqual(values(state, other));
    }
    const round = tabletopReducer(state, run('new_round', null, 99));
    const changed = ['d0_', 'd1_', 'd2_', 'd3_'].filter(
      (p) => values(round, p).join() !== values(state, p).join(),
    );
    expect(changed.length).toBeGreaterThan(2);
  });
});

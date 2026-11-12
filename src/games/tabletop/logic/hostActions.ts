/**
 * Prepares an action on the host before it is applied [ID: LOGIC-TABLETOP-HOST-ACTIONS]
 *
 * ADR-0005 determinism: the host decides every random result. It stamps a fresh seed and the
 * sender's seat (`HostStamp`) on the action and writes the results of plain random actions into
 * the payload (die value, shuffle order, spinner index, spawned bag id). Routines and triggers
 * draw from the same seed. Phones never run this; their optimistic copy is replaced by the delta.
 */
import type { TabletopAction } from './tabletopReducer';
import type {
  BagWidget,
  DeckWidget,
  DieWidget,
  SpinnerWidget,
  TabletopGameDefinition,
} from './types';
import { newSeed, rollValue, seededRng, shuffled, spawnId } from './rng';

/**
 * The action as the host applies it. `seat` is the sender's seat as the host resolved it (never
 * the phone's own claim in the action), `undefined` for the host's own actions (its viewer's
 * seat then counts); `seed` and `now` are for tests.
 */
export function prepareHostAction(
  action: TabletopAction,
  game: Pick<TabletopGameDefinition, 'widgets'>,
  seat: number | null | undefined,
  seed: number = newSeed(),
  now: number = Date.now(),
): TabletopAction {
  const host = seat === undefined ? { seed, now } : { seed, seat, now };
  const stamped = { ...action, host } as TabletopAction;
  // The payload results use their own stream, so routines see the same seed either way.
  const rng = seededRng(seed ^ 0x5bd1e995);
  const w = (id: string) => game.widgets[id];
  switch (stamped.type) {
    case 'ROLL_DIE': {
      const die = w(stamped.payload.dieId);
      if (stamped.payload.value !== undefined || die?.type !== 'die') return stamped;
      const value = rollValue((die as DieWidget).sides, rng);
      return { ...stamped, payload: { ...stamped.payload, value } };
    }
    case 'SHUFFLE_DECK': {
      const deck = w(stamped.payload.deckId);
      if (stamped.payload.order || deck?.type !== 'deck') return stamped;
      const order = shuffled(stamped.payload.newCardIds ?? (deck as DeckWidget).cardIds, rng);
      return { ...stamped, payload: { ...stamped.payload, order } };
    }
    case 'SPIN_SPINNER': {
      const spinner = w(stamped.payload.spinnerId);
      if (stamped.payload.index !== undefined || spinner?.type !== 'spinner') return stamped;
      const index = Math.floor(rng() * Math.max(1, (spinner as SpinnerWidget).options.length));
      return { ...stamped, payload: { ...stamped.payload, index } };
    }
    case 'DRAW_FROM_BAG': {
      const bag = w(stamped.payload.bagId);
      if (stamped.payload.spawnedId || !(bag as BagWidget | undefined)?.isInfinite) return stamped;
      return { ...stamped, payload: { ...stamped.payload, spawnedId: spawnId(rng) } };
    }
    default:
      return stamped;
  }
}

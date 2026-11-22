/**
 * Hand requests between seats in the table reducer [ID: LOGIC-TABLETOP-HAND-REQUEST-REDUCER]
 *
 * Applies `HAND_REQUEST` (#557) to `game.handRequests`; random picks draw from the action's
 * seeded RNG, so the host's result is the one every device gets.
 */
import type { TabletopGameState } from '../tabletopReducer';
import type { Rng } from '../rng';
import { applyHandRequest, type HandRequestOp } from '../handRequests';

export function handRequestReducer(
  state: TabletopGameState,
  op: HandRequestOp,
  rng: Rng,
): TabletopGameState {
  const { game } = state;
  const handRequests = applyHandRequest(game.handRequests, op, game.widgets, rng);
  if (handRequests === game.handRequests) return state;
  return { ...state, game: { ...game, handRequests } };
}

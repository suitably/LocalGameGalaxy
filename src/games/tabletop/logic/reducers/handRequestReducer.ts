/**
 * Hand requests between seats in the table reducer [ID: LOGIC-TABLETOP-HAND-REQUEST-REDUCER]
 *
 * Applies `HAND_REQUEST` (#557) to `game.handRequests`; random picks draw from the action's
 * seeded RNG, so the host's result is the one every device gets. An accepted offer moves the
 * offered cards into the receiver's first hand with ordinary `SNAP_TO_HOLDER` steps (the host
 * has already checked that the receiver sent the answer).
 */
import type { TabletopAction, TabletopGameState } from '../tabletopReducer';
import type { Rng } from '../rng';
import {
  acceptedOfferCards,
  applyHandRequest,
  seatHandHolderId,
  type HandRequestOp,
} from '../handRequests';

export function handRequestReducer(
  state: TabletopGameState,
  op: HandRequestOp,
  rng: Rng,
  apply: (s: TabletopGameState, a: TabletopAction) => TabletopGameState,
): TabletopGameState {
  const { game } = state;
  const moving = acceptedOfferCards(game.handRequests, op, game.widgets);
  const holderId = seatHandHolderId(game.widgets, op.to);
  // An offer to a seat without a hand cannot be accepted; it stays open for "reject".
  if (moving.length > 0 && !holderId) return state;
  const handRequests = applyHandRequest(game.handRequests, op, game.widgets, rng);
  if (handRequests === game.handRequests) return state;
  let next: TabletopGameState = { ...state, game: { ...game, handRequests } };
  if (!holderId) return next;
  for (const widgetId of moving) {
    next = apply(next, { type: 'SNAP_TO_HOLDER', payload: { widgetId, holderId } });
  }
  return next;
}

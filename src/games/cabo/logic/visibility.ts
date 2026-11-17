/**
 * Which cards a viewer sees face up [ID: LOGIC-CABO-VISIBILITY]
 *
 * Classic play: a hand card is shown only while it is being looked at — the bottom two at the
 * start of a round (`startPeek`) and the card of a 7/8 or 9/10 power during `reveal`. With
 * `memoryAid`, every card the viewer has seen stays face up for them.
 */
import type { CaboState } from './types';

export const START_PEEK_SLOTS: readonly number[] = [2, 3];

export function isCardVisible(
  state: CaboState,
  viewerId: string,
  ownerId: string,
  slot: number,
  startPeek = false,
): boolean {
  const owner = state.players.find((p) => p.id === ownerId);
  const viewer = state.players.find((p) => p.id === viewerId);
  const card = owner?.hand[slot];
  if (!owner || !viewer || !card) return false;

  const isCurrent = state.players[state.currentIndex]?.id === viewerId;
  if (
    isCurrent &&
    state.phase === 'reveal' &&
    state.revealed?.ownerId === ownerId &&
    state.revealed.slot === slot
  ) {
    return true;
  }
  if (startPeek && viewerId === ownerId && START_PEEK_SLOTS.includes(slot)) return true;
  return state.memoryAid && viewer.memory.includes(card.id);
}

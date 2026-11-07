/**
 * What a spectator sees of one Gartic Phone player this round [ID: GARTIC-SPECTATOR-VIEW]
 *
 * The step the player answers (`received`, none in the first round) and, once sent, the
 * player's own step (`sent`). Unsent work is never part of the room state, so it never shows.
 */
import { getPlayerAssignedBook, isPlayerFinishedCurrentRound } from '../garticEngine';
import type { GarticGameState, GarticStep } from '../types';

export interface GarticSpectatorView {
  task: 'prompt' | 'drawing' | 'guessing';
  received: GarticStep | null;
  sent: GarticStep | null;
}

export function garticSpectatorView(
  state: GarticGameState,
  playerId: string,
): GarticSpectatorView | null {
  if (state.phase !== 'prompt' && state.phase !== 'drawing' && state.phase !== 'guessing') {
    return null;
  }
  const book = getPlayerAssignedBook(state, playerId);
  if (!book) return null;
  const done = isPlayerFinishedCurrentRound(state, playerId);
  const steps = book.steps;
  const sent = done ? (steps[steps.length - 1] ?? null) : null;
  const received = (done ? steps[steps.length - 2] : steps[steps.length - 1]) ?? null;
  const task = !received ? 'prompt' : received.type === 'prompt' ? 'drawing' : 'guessing';
  return { task, received, sent };
}

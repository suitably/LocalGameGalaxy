/**
 * Test helper: plays a scripted game with random legal moves found through the view.
 */
import { seededRng, type Rng } from '../../../logic/rng';
import { rankOf } from '../cardDeck';
import type { AnyGameScript, ScriptMove, ScriptView } from '../scriptTypes';

/** Moves worth trying for a view: every button, single cards, sets of one rank, pairs. */
export function candidateMoves(view: ScriptView): ScriptMove[] {
  const moves: ScriptMove[] = view.actions.map((a) => ({ kind: 'action', id: a.id, arg: a.arg }));
  if (view.select === 'none') return moves;
  const targets: (string | undefined)[] = view.targets.length > 0 ? view.targets : [undefined];
  for (const card of view.hand) {
    for (const target of targets) moves.push({ kind: 'cards', cards: [card], target });
  }
  if (view.select === 'many') {
    for (let i = 0; i < view.hand.length; i++) {
      const same = view.hand.filter((c) => rankOf(c) === rankOf(view.hand[i]));
      for (let n = 2; n <= same.length; n++) moves.push({ kind: 'cards', cards: same.slice(0, n) });
      for (let j = i + 1; j < view.hand.length; j++) {
        moves.push({ kind: 'cards', cards: [view.hand[i], view.hand[j]] });
      }
    }
  }
  return moves;
}

/** Plays until `rounds` summaries were passed; throws when a seat to act has no legal move. */
export function playRounds(script: AnyGameScript, players: number, seed: number, rounds: number) {
  const rng: Rng = seededRng(seed);
  let state = script.start(players, rng);
  let seen = 0;
  const states: unknown[] = [state];
  for (let guard = 0; guard < 20000 && seen < rounds; guard++) {
    const table = script.view(state, null);
    const seat = table.active[0] ?? 0;
    const view = script.view(state, seat);
    if (view.summary) seen++;
    const options = candidateMoves(view)
      .map((m) => script.move(state, seat, m, rng))
      .filter((next) => next !== state);
    if (options.length === 0) throw new Error(`no legal move for seat ${seat}: ${view.status}`);
    state = options[Math.floor(rng() * options.length)];
    states.push(state);
  }
  if (seen < rounds) throw new Error('game did not finish');
  return states;
}

/**
 * Schwarzer Peter state for one device: rules state plus the pass-and-play cover
 * [ID: LOGIC-SP-HOOK]
 *
 * The cover is set whenever a new turn starts, so the next drawer's hand stays hidden until they
 * reveal it. Pure reducer, so the handover rules are unit-tested.
 */
import { useCallback, useReducer } from 'react';
import { applyAction, createGame } from '../logic/engine';
import type { Card, Rng, SPAction, SPState } from '../logic/types';

export interface SPStage {
  game: SPState | null;
  /** Player id whose cover is shown (their hand must stay hidden), or null. */
  coverFor: string | null;
}

export type SPStageAction =
  | { type: 'start'; playerNames: string[]; deck?: Card[]; rng?: Rng }
  | { type: 'act'; action: SPAction; rng?: Rng }
  | { type: 'reveal' }
  | { type: 'restart' };

export const initialSPStage: SPStage = { game: null, coverFor: null };

/** A new turn begins when the phase returns to 'draw' or the drawer changes. */
function turnStarted(prev: SPState, next: SPState): boolean {
  return (
    next.phase === 'draw' && (prev.phase !== 'draw' || next.currentIndex !== prev.currentIndex)
  );
}

export function spStageReducer(stage: SPStage, action: SPStageAction): SPStage {
  switch (action.type) {
    case 'start': {
      const game = createGame(action.playerNames, { deck: action.deck, rng: action.rng });
      return { game, coverFor: game.phase === 'draw' ? game.players[game.currentIndex].id : null };
    }
    case 'act': {
      const { game } = stage;
      if (!game) return stage;
      const result = applyAction(game, action.action, action.rng);
      if (!result.ok) return stage;
      const next = result.state;
      return {
        game: next,
        coverFor: turnStarted(game, next) ? next.players[next.currentIndex].id : null,
      };
    }
    case 'reveal':
      return stage.coverFor === null ? stage : { ...stage, coverFor: null };
    case 'restart':
      return initialSPStage;
  }
}

export function useSchwarzerPeterGame() {
  const [stage, dispatch] = useReducer(spStageReducer, initialSPStage);

  const start = useCallback(
    (playerNames: string[]) => dispatch({ type: 'start', playerNames }),
    [],
  );
  const act = useCallback((action: SPAction) => dispatch({ type: 'act', action }), []);
  const reveal = useCallback(() => dispatch({ type: 'reveal' }), []);
  const restart = useCallback(() => dispatch({ type: 'restart' }), []);

  return { game: stage.game, coverFor: stage.coverFor, start, act, reveal, restart };
}

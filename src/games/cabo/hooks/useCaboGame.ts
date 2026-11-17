/**
 * Cabo game state for one device: rules state plus the pass-and-play cover [ID: LOGIC-CABO-HOOK]
 *
 * The cover is set whenever the turn moves to another player, so the next player's hand is
 * hidden until they reveal it. Pure reducer, so the handover rules are unit-tested.
 */
import { useCallback, useReducer } from 'react';
import { applyAction, createGame } from '../logic/engine';
import type { Card, CaboAction, CaboState } from '../logic/types';

export interface CaboStage {
  game: CaboState | null;
  /** Player id whose cover is shown (their hand must stay hidden), or null. */
  coverFor: string | null;
}

export type CaboStageAction =
  | { type: 'start'; playerNames: string[]; deck?: Card[] }
  | { type: 'act'; action: CaboAction }
  | { type: 'reveal' }
  | { type: 'retarget'; playerId: string }
  | { type: 'restart' };

export const initialCaboStage: CaboStage = { game: null, coverFor: null };

export function caboStageReducer(stage: CaboStage, action: CaboStageAction): CaboStage {
  switch (action.type) {
    case 'start': {
      const game = createGame(action.playerNames, { deck: action.deck });
      return { game, coverFor: game.players[0].id };
    }
    case 'act': {
      const { game } = stage;
      if (!game) return stage;
      const result = applyAction(game, action.action);
      if (!result.ok) return stage;
      const next = result.state;
      // A new turn starts when the phase returns to 'turn' from another phase (next round) or the index moves.
      const turnMoved =
        next.phase === 'turn' && (game.phase !== 'turn' || next.currentIndex !== game.currentIndex);
      return {
        game: next,
        coverFor: turnMoved ? next.players[next.currentIndex].id : null,
      };
    }
    case 'reveal':
      return stage.coverFor === null ? stage : { ...stage, coverFor: null };
    case 'retarget':
      return stage.coverFor === null ? stage : { ...stage, coverFor: action.playerId };
    case 'restart':
      return initialCaboStage;
  }
}

export function useCaboGame() {
  const [stage, dispatch] = useReducer(caboStageReducer, initialCaboStage);

  const start = useCallback(
    (playerNames: string[]) => dispatch({ type: 'start', playerNames }),
    [],
  );
  const act = useCallback((action: CaboAction) => dispatch({ type: 'act', action }), []);
  const reveal = useCallback(() => dispatch({ type: 'reveal' }), []);
  const retarget = useCallback((playerId: string) => dispatch({ type: 'retarget', playerId }), []);
  const restart = useCallback(() => dispatch({ type: 'restart' }), []);

  return { game: stage.game, coverFor: stage.coverFor, start, act, reveal, retarget, restart };
}

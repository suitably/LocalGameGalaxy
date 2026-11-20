/**
 * Golf game state for one device [ID: LOGIC-GOLF-HOOK]
 *
 * All information is public, so there is no pass-and-play cover: the stage is only the rules
 * state. Pure reducer, so it is unit-tested without React.
 */
import { useCallback, useReducer } from 'react';
import { applyAction, createGame } from '../logic/engine';
import type { Card, GolfAction, GolfState } from '../logic/types';

export interface GolfStage {
  game: GolfState | null;
}

export type GolfStageAction =
  | { type: 'start'; playerNames: string[]; deck?: Card[] }
  | { type: 'act'; action: GolfAction }
  | { type: 'restart' };

export const initialGolfStage: GolfStage = { game: null };

export function golfStageReducer(stage: GolfStage, action: GolfStageAction): GolfStage {
  switch (action.type) {
    case 'start':
      return { game: createGame(action.playerNames, { deck: action.deck }) };
    case 'act': {
      if (!stage.game) return stage;
      const result = applyAction(stage.game, action.action);
      return result.ok ? { game: result.state } : stage;
    }
    case 'restart':
      return initialGolfStage;
  }
}

export function useGolfGame() {
  const [stage, dispatch] = useReducer(golfStageReducer, initialGolfStage);

  const start = useCallback(
    (playerNames: string[]) => dispatch({ type: 'start', playerNames }),
    [],
  );
  const act = useCallback((action: GolfAction) => dispatch({ type: 'act', action }), []);
  const restart = useCallback(() => dispatch({ type: 'restart' }), []);

  return { game: stage.game, start, act, restart };
}

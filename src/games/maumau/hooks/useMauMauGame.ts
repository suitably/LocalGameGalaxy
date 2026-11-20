/**
 * Mau-Mau game state for one device: rules state plus the pass-and-play cover [ID: LOGIC-MAUMAU-HOOK]
 *
 * The cover is set whenever the turn moves to another player (or a new round starts), so the
 * next player's hand is hidden until they reveal it.
 */
import { useCallback, useReducer } from 'react';
import { applyAction, createGame } from '../logic/engine';
import type { Card, MauMauAction, MauMauState } from '../logic/types';

export interface MauMauStage {
  game: MauMauState | null;
  /** Player id whose cover is shown (their hand must stay hidden), or null. */
  coverFor: string | null;
}

export type MauMauStageAction =
  | { type: 'start'; playerNames: string[]; deck?: Card[] }
  | { type: 'act'; action: MauMauAction }
  | { type: 'reveal' }
  | { type: 'restart' };

export const initialMauMauStage: MauMauStage = { game: null, coverFor: null };

export function mauMauStageReducer(stage: MauMauStage, action: MauMauStageAction): MauMauStage {
  switch (action.type) {
    case 'start': {
      const game = createGame(action.playerNames, { deck: action.deck });
      return { game, coverFor: game.players[game.currentIndex].id };
    }
    case 'act': {
      const { game } = stage;
      if (!game) return stage;
      const result = applyAction(game, action.action);
      if (!result.ok) return stage;
      const next = result.state;
      const turnMoved =
        next.phase === 'turn' &&
        (game.phase === 'round_over' || next.currentIndex !== game.currentIndex);
      return { game: next, coverFor: turnMoved ? next.players[next.currentIndex].id : null };
    }
    case 'reveal':
      return stage.coverFor === null ? stage : { ...stage, coverFor: null };
    case 'restart':
      return initialMauMauStage;
  }
}

export function useMauMauGame() {
  const [stage, dispatch] = useReducer(mauMauStageReducer, initialMauMauStage);
  const start = useCallback(
    (playerNames: string[]) => dispatch({ type: 'start', playerNames }),
    [],
  );
  const act = useCallback((action: MauMauAction) => dispatch({ type: 'act', action }), []);
  const reveal = useCallback(() => dispatch({ type: 'reveal' }), []);
  const restart = useCallback(() => dispatch({ type: 'restart' }), []);
  return { game: stage.game, coverFor: stage.coverFor, start, act, reveal, restart };
}

/**
 * Cabo game state for one device: rules state, the pass-and-play cover and the start peek
 * [ID: LOGIC-CABO-HOOK]
 *
 * The cover is set whenever the turn moves to another player, so the next player's hand is
 * hidden until they reveal it. Before a player's first action of a round they look at their
 * bottom two cards once (`startPeekSeen`). Pure reducer, so these rules are unit-tested.
 */
import { useCallback, useReducer } from 'react';
import { applyAction, createGame } from '../logic/engine';
import type { Card, CaboAction, CaboState } from '../logic/types';

export interface CaboStage {
  game: CaboState | null;
  /** Player id whose cover is shown (their hand must stay hidden), or null. */
  coverFor: string | null;
  /** Players who already looked at their bottom two cards this round. */
  startPeekSeen: string[];
}

export interface CaboStartOptions {
  memoryAid?: boolean;
  /** Fixed deck for tests. */
  deck?: Card[];
}

export type CaboStageAction =
  | { type: 'start'; playerNames: string[]; options?: CaboStartOptions }
  | { type: 'act'; action: CaboAction }
  | { type: 'reveal' }
  | { type: 'ack_start_peek' }
  | { type: 'restart' };

export const initialCaboStage: CaboStage = { game: null, coverFor: null, startPeekSeen: [] };

/** True while the current player still has to look at their bottom two cards. */
export function needsStartPeek(stage: CaboStage): boolean {
  const { game } = stage;
  if (!game || game.phase !== 'turn') return false;
  return !stage.startPeekSeen.includes(game.players[game.currentIndex].id);
}

export function caboStageReducer(stage: CaboStage, action: CaboStageAction): CaboStage {
  switch (action.type) {
    case 'start': {
      const game = createGame(action.playerNames, {
        memoryAid: action.options?.memoryAid,
        deck: action.options?.deck,
      });
      return { game, coverFor: game.players[game.currentIndex].id, startPeekSeen: [] };
    }
    case 'act': {
      const { game } = stage;
      if (!game || stage.coverFor !== null || needsStartPeek(stage)) return stage;
      const result = applyAction(game, action.action);
      if (!result.ok) return stage;
      const next = result.state;
      const newRound = next.roundNumber !== game.roundNumber;
      // A new turn starts when the phase returns to 'turn' from another phase or the index moves.
      const turnMoved =
        next.phase === 'turn' && (game.phase !== 'turn' || next.currentIndex !== game.currentIndex);
      return {
        game: next,
        coverFor: turnMoved ? next.players[next.currentIndex].id : null,
        startPeekSeen: newRound ? [] : stage.startPeekSeen,
      };
    }
    case 'reveal':
      return stage.coverFor === null ? stage : { ...stage, coverFor: null };
    case 'ack_start_peek': {
      if (!stage.game || stage.coverFor !== null || !needsStartPeek(stage)) return stage;
      const id = stage.game.players[stage.game.currentIndex].id;
      return { ...stage, startPeekSeen: [...stage.startPeekSeen, id] };
    }
    case 'restart':
      return initialCaboStage;
  }
}

export function useCaboGame() {
  const [stage, dispatch] = useReducer(caboStageReducer, initialCaboStage);

  const start = useCallback(
    (playerNames: string[], options?: CaboStartOptions) =>
      dispatch({ type: 'start', playerNames, options }),
    [],
  );
  const act = useCallback((action: CaboAction) => dispatch({ type: 'act', action }), []);
  const reveal = useCallback(() => dispatch({ type: 'reveal' }), []);
  const ackStartPeek = useCallback(() => dispatch({ type: 'ack_start_peek' }), []);
  const restart = useCallback(() => dispatch({ type: 'restart' }), []);

  return {
    game: stage.game,
    coverFor: stage.coverFor,
    startPeek: needsStartPeek(stage),
    start,
    act,
    reveal,
    ackStartPeek,
    restart,
  };
}

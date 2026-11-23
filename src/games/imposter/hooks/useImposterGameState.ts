import { useState } from 'react';
import type { Player, GameState, DbCategory } from '../logic/types';
import { pickWordPair } from '../logic/pickWordPair';

const INITIAL_STATE: GameState = {
  phase: 'LOBBY',
  players: [],
  selectedCategories: [],
  selectedWord: null,
  selectedHint: null,
  imposterCount: 1,
  timerLength: 300,
  remainingTime: 300,
  isPaused: false,
  currentPlayerIndex: 0,
  winner: null,
};

export function useImposterGameState(lobbyPlayers: Array<{ name: string }>, language: string) {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);

  const startGame = async (setup: {
    categories: DbCategory[];
    imposterCount: number;
    timerLength: number;
  }) => {
    const drawn = await pickWordPair(setup.categories, language);
    if (!drawn) return;
    const { word, hint } = drawn;

    const playerList: Player[] = lobbyPlayers.map((p, idx) => ({
      id: `p_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      name: p.name,
      isImposter: false,
      isKicked: false,
    }));

    const shuffled = [...playerList].sort(() => 0.5 - Math.random());
    const imposterIds = new Set(shuffled.slice(0, setup.imposterCount).map((p) => p.id));

    const updatedPlayers = playerList.map((p) => ({
      ...p,
      isImposter: imposterIds.has(p.id),
      isKicked: false,
    }));

    setGameState({
      ...gameState,
      phase: 'HANDOVER',
      players: updatedPlayers,
      selectedCategories: setup.categories,
      selectedWord: word,
      selectedHint: hint,
      imposterCount: setup.imposterCount,
      timerLength: setup.timerLength,
      remainingTime: setup.timerLength,
      currentPlayerIndex: 0,
      winner: null,
    });
  };

  const nextHandover = () => {
    if (gameState.currentPlayerIndex < gameState.players.length - 1) {
      setGameState((prev) => ({ ...prev, currentPlayerIndex: prev.currentPlayerIndex + 1 }));
    } else {
      setGameState((prev) => ({ ...prev, phase: 'TIMER' }));
    }
  };

  const goToVoting = () => setGameState((prev) => ({ ...prev, phase: 'VOTING' }));

  const handleKick = (playerId: string) => {
    const kickedPlayer = gameState.players.find((p) => p.id === playerId);
    const winners = kickedPlayer?.isImposter ? 'NORMAL' : 'IMPOSTERS';

    setGameState((prev) => ({
      ...prev,
      phase: 'RESULT',
      players: prev.players.map((p) => (p.id === playerId ? { ...p, isKicked: true } : p)),
      winner: winners as 'IMPOSTERS' | 'NORMAL',
    }));
  };

  const resetGame = () => setGameState(INITIAL_STATE);

  return { gameState, startGame, nextHandover, goToVoting, handleKick, resetGame };
}

import { useState, useCallback, useEffect } from 'react';
import { storage, STORAGE_KEYS } from '../../lib/storage';

export type ThrowMultiplier = 1 | 2 | 3;
export type ThrowValue =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 25
  | 50
  | 0;

export interface DartThrow {
  value: ThrowValue;
  multiplier: ThrowMultiplier;
  score: number; // calculated: value * multiplier
}

export interface Turn {
  playerId: string;
  throws: DartThrow[];
  scoreBefore: number;
  scoreAfter: number;
  busted: boolean;
}

export interface Player {
  id: string;
  name: string;
}

export type GameMode = '301' | '501' | 'count_up';

export interface GameSettings {
  mode: GameMode;
  doubleOut: boolean;
}

const STORAGE_KEY = STORAGE_KEYS.DARTS_GAME_STATE;

interface PersistedState {
  settings: GameSettings;
  players: Player[];
  turns: Turn[];
  currentPlayerIndex: number;
  currentTurnThrows: DartThrow[];
  winner: string | null;
}

export function useDartsGame() {
  const [settings, setSettings] = useState<GameSettings>({ mode: '501', doubleOut: true });
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'Player 1' },
    { id: '2', name: 'Player 2' },
  ]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentTurnThrows, setCurrentTurnThrows] = useState<DartThrow[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  // Load state from storage on mount
  useEffect(() => {
    const savedState = storage.get(STORAGE_KEY as unknown as string) as unknown as string | null;
    if (savedState) {
      const parsed = JSON.parse(savedState) as PersistedState;
      setSettings(parsed.settings);
      setPlayers(parsed.players);
      setTurns(parsed.turns);
      setCurrentPlayerIndex(parsed.currentPlayerIndex);
      setCurrentTurnThrows(parsed.currentTurnThrows);
      setWinner(parsed.winner);
    }
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    const stateToSave: PersistedState = {
      settings,
      players,
      turns,
      currentPlayerIndex,
      currentTurnThrows,
      winner,
    };
    storage.set(STORAGE_KEY as unknown as string, JSON.stringify(stateToSave));
  }, [settings, players, turns, currentPlayerIndex, currentTurnThrows, winner]);

  const getStartingScore = (mode: GameMode) => {
    if (mode === '301') return 301;
    if (mode === '501') return 501;
    return 0; // count up
  };

  const getPlayerScore = useCallback(
    (playerId: string) => {
      const isCountDown = settings.mode === '301' || settings.mode === '501';
      let score = isCountDown ? getStartingScore(settings.mode) : 0;

      for (const turn of turns) {
        if (turn.playerId === playerId) {
          if (isCountDown) {
            if (!turn.busted) score -= turn.throws.reduce((acc, t) => acc + t.score, 0);
          } else {
            score += turn.throws.reduce((acc, t) => acc + t.score, 0);
          }
        }
      }

      // Apply current turn throws
      if (playerId === players[currentPlayerIndex]?.id) {
        if (isCountDown) {
          score -= currentTurnThrows.reduce((acc, t) => acc + t.score, 0);
        } else {
          score += currentTurnThrows.reduce((acc, t) => acc + t.score, 0);
        }
      }

      return score;
    },
    [turns, currentTurnThrows, currentPlayerIndex, players, settings.mode],
  );

  const addThrow = useCallback(
    (throwData: DartThrow) => {
      if (winner) return;

      const currentPlayer = players[currentPlayerIndex];
      const isCountDown = settings.mode === '301' || settings.mode === '501';
      const currentScore = getPlayerScore(currentPlayer.id);
      const newScore = isCountDown
        ? currentScore - throwData.score
        : currentScore + throwData.score;

      const updatedThrows = [...currentTurnThrows, throwData];
      let isBusted = false;
      let isWinner = false;

      if (isCountDown) {
        if (newScore < 0 || (newScore === 1 && settings.doubleOut)) {
          isBusted = true;
        } else if (newScore === 0) {
          if (settings.doubleOut && throwData.multiplier !== 2 && throwData.value !== 50) {
            isBusted = true;
          } else {
            isWinner = true;
          }
        }
      }

      if (isBusted || isWinner || updatedThrows.length === 3) {
        // End turn
        const scoreBeforeTurn = isCountDown
          ? currentScore + currentTurnThrows.reduce((a, b) => a + b.score, 0)
          : currentScore - currentTurnThrows.reduce((a, b) => a + b.score, 0);
        const scoreAfterTurn = isBusted ? scoreBeforeTurn : newScore;

        const newTurn: Turn = {
          playerId: currentPlayer.id,
          throws: updatedThrows,
          scoreBefore: scoreBeforeTurn,
          scoreAfter: scoreAfterTurn,
          busted: isBusted,
        };

        setTurns((prev) => [...prev, newTurn]);
        setCurrentTurnThrows([]);

        if (isWinner) {
          setWinner(currentPlayer.id);
        } else {
          setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
        }
      } else {
        setCurrentTurnThrows(updatedThrows);
      }
    },
    [currentTurnThrows, currentPlayerIndex, players, settings, getPlayerScore, winner],
  );

  const undoThrow = useCallback(() => {
    if (winner) setWinner(null);

    if (currentTurnThrows.length > 0) {
      setCurrentTurnThrows((prev) => prev.slice(0, -1));
    } else if (turns.length > 0) {
      const lastTurn = turns[turns.length - 1];
      setTurns((prev) => prev.slice(0, -1));

      const prevPlayerIndex = players.findIndex((p) => p.id === lastTurn.playerId);
      setCurrentPlayerIndex(prevPlayerIndex);

      // Set current throws to the throws of the undone turn, minus the last one
      if (lastTurn.throws.length > 0) {
        setCurrentTurnThrows(lastTurn.throws.slice(0, -1));
      }
    }
  }, [currentTurnThrows, turns, players, winner]);

  const resetGame = useCallback(() => {
    setTurns([]);
    setCurrentPlayerIndex(0);
    setCurrentTurnThrows([]);
    setWinner(null);
  }, []);

  const updateSettings = useCallback(
    (newSettings: Partial<GameSettings>) => {
      setSettings((prev) => {
        const changedMode = newSettings.mode !== undefined && newSettings.mode !== prev.mode;
        if (changedMode) resetGame();
        return { ...prev, ...newSettings };
      });
    },
    [resetGame],
  );

  const updatePlayers = useCallback(
    (newPlayers: Player[]) => {
      setPlayers((prev) => {
        // Only reset if number of players changed or their IDs changed
        const changed =
          prev.length !== newPlayers.length || prev.some((p, i) => p.id !== newPlayers[i].id);
        if (changed) resetGame();
        return newPlayers;
      });
    },
    [resetGame],
  );

  return {
    settings,
    players,
    turns,
    currentPlayerIndex,
    currentTurnThrows,
    winner,
    getPlayerScore,
    addThrow,
    undoThrow,
    resetGame,
    updateSettings,
    updatePlayers,
  };
}

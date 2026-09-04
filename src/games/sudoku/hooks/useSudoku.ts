/**
 * useSudoku.ts - React Hook Managing Sudoku State, Timer, History & Persistence
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { sudokuGenerator } from '../logic/sudokuGenerator';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import type {
  SudokuDifficulty,
  SudokuMove,
  SudokuState,
  SudokuStats,
} from '../logic/types';

const defaultStats: SudokuStats = {
  played: 0,
  completed: 0,
  bestTime: {
    easy: null,
    medium: null,
    hard: null,
    expert: null,
  },
};

export function useSudoku(initialDifficulty: SudokuDifficulty = 'medium') {
  const [stats, setStats] = useState<SudokuStats>(() => 
    storage.getJson<SudokuStats>(STORAGE_KEYS.SUDOKU_STATS, defaultStats)
  );

  const [history, setHistory] = useState<SudokuMove[]>([]);

  const [state, setState] = useState<SudokuState>(() => {
    const saved = storage.getJson<SudokuState | null>(STORAGE_KEYS.SUDOKU_STATE, null);
    if (saved && saved.grid && !saved.isCompleted && !saved.isGameOver) {
      return saved;
    }

    const { grid } = sudokuGenerator.generatePuzzle(initialDifficulty);
    return {
      grid,
      difficulty: initialDifficulty,
      selectedCell: null,
      isPencilMode: false,
      mistakes: 0,
      maxMistakes: 3,
      timeElapsed: 0,
      isPaused: false,
      isCompleted: false,
      isGameOver: false,
      hintsUsed: 0,
    };
  });

  // Timer effect
  useEffect(() => {
    if (state.isPaused || state.isCompleted || state.isGameOver) return;

    const timer = setInterval(() => {
      setState((prev) => ({ ...prev, timeElapsed: prev.timeElapsed + 1 }));
    }, 1000);

    return () => clearInterval(timer);
  }, [state.isPaused, state.isCompleted, state.isGameOver]);

  // Persist state
  useEffect(() => {
    if (!state.isCompleted && !state.isGameOver) {
      storage.setJson(STORAGE_KEYS.SUDOKU_STATE, state);
    } else {
      storage.remove(STORAGE_KEYS.SUDOKU_STATE);
    }
  }, [state]);

  // Persist stats
  useEffect(() => {
    storage.setJson(STORAGE_KEYS.SUDOKU_STATS, stats);
  }, [stats]);

  const startNewGame = useCallback((difficulty: SudokuDifficulty = state.difficulty) => {
    const { grid } = sudokuGenerator.generatePuzzle(difficulty);
    setHistory([]);
    setState({
      grid,
      difficulty,
      selectedCell: null,
      isPencilMode: false,
      mistakes: 0,
      maxMistakes: 3,
      timeElapsed: 0,
      isPaused: false,
      isCompleted: false,
      isGameOver: false,
      hintsUsed: 0,
    });
    setStats((prev) => ({ ...prev, played: prev.played + 1 }));
  }, [state.difficulty]);

  const selectCell = useCallback((row: number, col: number) => {
    setState((prev) => {
      if (prev.isPaused || prev.isCompleted || prev.isGameOver) return prev;
      return {
        ...prev,
        selectedCell: { row, col },
      };
    });
  }, []);

  const inputNumber = useCallback((num: number) => {
    setState((prev) => {
      if (prev.isPaused || prev.isCompleted || prev.isGameOver || !prev.selectedCell) {
        return prev;
      }

      const { row, col } = prev.selectedCell;
      const targetCell = prev.grid[row][col];
      if (targetCell.isInitial || targetCell.value === targetCell.solution) {
        return prev;
      }

      // 1. Pencil Note Mode
      if (prev.isPencilMode) {
        const newNotes = targetCell.notes.includes(num)
          ? targetCell.notes.filter((n) => n !== num)
          : [...targetCell.notes, num].sort((a, b) => a - b);

        const newGrid = prev.grid.map((r, rIdx) =>
          r.map((c, cIdx) => (rIdx === row && cIdx === col ? { ...c, notes: newNotes } : c))
        );

        return { ...prev, grid: newGrid };
      }

      // 2. Direct Value Entry
      const isCorrect = num === targetCell.solution;
      const newMistakes = isCorrect ? prev.mistakes : prev.mistakes + 1;
      const isGameOver = newMistakes >= prev.maxMistakes;

      // Track move for undo
      setHistory((prevHistory) => [
        ...prevHistory,
        {
          row,
          col,
          prevValue: targetCell.value,
          newValue: isCorrect ? num : targetCell.value,
          prevNotes: [...targetCell.notes],
          newNotes: isCorrect ? [] : targetCell.notes,
        },
      ]);

      const newGrid = prev.grid.map((r, rIdx) =>
        r.map((c, cIdx) => {
          if (rIdx === row && cIdx === col) {
            return {
              ...c,
              value: isCorrect ? num : num,
              isError: !isCorrect,
              notes: isCorrect ? [] : c.notes,
            };
          }
          // Remove notes of this number from same row, col, block if correct
          if (isCorrect) {
            const isSameRow = rIdx === row;
            const isSameCol = cIdx === col;
            const isSameBlock =
              Math.floor(rIdx / 3) === Math.floor(row / 3) &&
              Math.floor(cIdx / 3) === Math.floor(col / 3);
            if (isSameRow || isSameCol || isSameBlock) {
              return { ...c, notes: c.notes.filter((n) => n !== num) };
            }
          }
          return c;
        })
      );

      const isCompleted = isCorrect && sudokuGenerator.isBoardComplete(newGrid);

      if (isCompleted) {
        setStats((prevStats) => {
          const currentBest = prevStats.bestTime[prev.difficulty];
          const newBest = currentBest === null ? prev.timeElapsed : Math.min(currentBest, prev.timeElapsed);
          return {
            ...prevStats,
            completed: prevStats.completed + 1,
            bestTime: { ...prevStats.bestTime, [prev.difficulty]: newBest },
          };
        });
      }

      return {
        ...prev,
        grid: newGrid,
        mistakes: newMistakes,
        isCompleted,
        isGameOver,
      };
    });
  }, []);

  const eraseCell = useCallback(() => {
    setState((prev) => {
      if (prev.isPaused || prev.isCompleted || prev.isGameOver || !prev.selectedCell) return prev;
      const { row, col } = prev.selectedCell;
      const target = prev.grid[row][col];
      if (target.isInitial) return prev;

      const newGrid = prev.grid.map((r, rIdx) =>
        r.map((c, cIdx) => (rIdx === row && cIdx === col ? { ...c, value: 0, isError: false, notes: [] } : c))
      );

      return { ...prev, grid: newGrid };
    });
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const lastMove = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    setState((prev) => {
      const newGrid = prev.grid.map((r, rIdx) =>
        r.map((c, cIdx) =>
          rIdx === lastMove.row && cIdx === lastMove.col
            ? { ...c, value: lastMove.prevValue, notes: lastMove.prevNotes, isError: false }
            : c
        )
      );
      return { ...prev, grid: newGrid };
    });
  }, [history]);

  const useHint = useCallback(() => {
    setState((prev) => {
      if (prev.isPaused || prev.isCompleted || prev.isGameOver || !prev.selectedCell) return prev;
      const { row, col } = prev.selectedCell;
      const target = prev.grid[row][col];
      if (target.value === target.solution) return prev;

      const newGrid = prev.grid.map((r, rIdx) =>
        r.map((c, cIdx) =>
          rIdx === row && cIdx === col
            ? { ...c, value: c.solution, isError: false, notes: [] }
            : c
        )
      );

      const isCompleted = sudokuGenerator.isBoardComplete(newGrid);

      return {
        ...prev,
        grid: newGrid,
        hintsUsed: prev.hintsUsed + 1,
        isCompleted,
      };
    });
  }, []);

  const togglePencilMode = useCallback(() => {
    setState((prev) => ({ ...prev, isPencilMode: !prev.isPencilMode }));
  }, []);

  const togglePause = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  const remainingCounts = useMemo(() => {
    return sudokuGenerator.getRemainingCounts(state.grid);
  }, [state.grid]);

  return {
    state,
    stats,
    remainingCounts,
    startNewGame,
    selectCell,
    inputNumber,
    eraseCell,
    undo,
    useHint,
    togglePencilMode,
    togglePause,
  };
}

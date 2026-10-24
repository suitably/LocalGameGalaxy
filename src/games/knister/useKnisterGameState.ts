import { useReducer, useEffect, useState, useCallback } from 'react';
import { storage } from '../../lib/storage';
import { knisterReducer, INITIAL_KNISTER_STATE } from './logic/knisterReducer';
import type { KnisterState } from './logic/types';

const STORAGE_KEY_KNISTER_STATE = 'knister_current_game';
const STORAGE_KEY_SHOW_DICE = 'knister_show_dice';

interface Cell {
  row: number;
  col: number;
}

const loadInitialState = (initial: KnisterState): KnisterState => {
  const saved = storage.getJson<KnisterState | null>(STORAGE_KEY_KNISTER_STATE, null);
  if (saved && Array.isArray(saved.players) && saved.players.length > 0) {
    return {
      ...initial,
      ...saved,
      moveHistory: Array.isArray(saved.moveHistory) ? saved.moveHistory : [],
    };
  }
  return initial;
};

/** State, persistence and handlers of a local (single-device) Knister game. */
export const useKnisterGameState = () => {
  const [state, dispatch] = useReducer(knisterReducer, INITIAL_KNISTER_STATE, loadInitialState);
  const [showDice, setShowDice] = useState<boolean>(
    () => storage.get(STORAGE_KEY_SHOW_DICE, 'true') === 'true',
  );
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [pickerTargetCell, setPickerTargetCell] = useState<Cell | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  // Game-over modal is dismissed per finished game: remembers the move count at dismissal
  const [dismissedAtMoves, setDismissedAtMoves] = useState<number | null>(null);
  const movesPlayed = state.moveHistory?.length ?? 0;
  const gameOverModalOpen = state.isGameOver && dismissedAtMoves !== movesPlayed;

  useEffect(() => {
    storage.setJson(STORAGE_KEY_KNISTER_STATE, state);
  }, [state]);

  useEffect(() => {
    storage.set(STORAGE_KEY_SHOW_DICE, String(showDice));
  }, [showDice]);

  const activePlayer = state.players[state.activePlayerIndex] || state.players[0];

  const handleRollDice = useCallback((d1: number, d2: number) => {
    setSelectedNumber(null);
    dispatch({ type: 'ROLL_DICE', die1: d1, die2: d2 });
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (selectedNumber !== null) {
        dispatch({
          type: 'PLACE_NUMBER',
          row,
          col,
          playerId: activePlayer.id,
          value: selectedNumber,
        });
        setSelectedNumber(null);
      } else if (state.currentRoll !== null) {
        dispatch({ type: 'PLACE_NUMBER', row, col, playerId: activePlayer.id });
      }
    },
    [activePlayer.id, selectedNumber, state.currentRoll],
  );

  const handleOpenPicker = useCallback((row: number, col: number) => {
    setPickerTargetCell({ row, col });
  }, []);

  const handlePickerSelectNumber = useCallback(
    (num: number, row: number, col: number) => {
      dispatch({ type: 'PLACE_NUMBER', row, col, playerId: activePlayer.id, value: num });
      setSelectedNumber(null);
      setPickerTargetCell(null);
    },
    [activePlayer.id],
  );

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO_MOVE' });
    setSelectedNumber(null);
    setPickerTargetCell(null);
  }, []);

  const handleNewGame = useCallback(() => {
    dispatch({ type: 'NEW_GAME' });
    setSelectedNumber(null);
    setPickerTargetCell(null);
    setResetDialogOpen(false);
    setDismissedAtMoves(null);
  }, []);

  return {
    state,
    dispatch,
    activePlayer,
    showDice,
    toggleDice: () => setShowDice((prev) => !prev),
    selectedNumber,
    setSelectedNumber,
    pickerTargetCell,
    closePicker: () => setPickerTargetCell(null),
    legendOpen,
    setLegendOpen,
    resetDialogOpen,
    setResetDialogOpen,
    gameOverModalOpen,
    closeGameOverModal: () => setDismissedAtMoves(movesPlayed),
    hasActiveSum: state.currentRoll !== null || selectedNumber !== null,
    handleRollDice,
    handleCellClick,
    handleOpenPicker,
    handlePickerSelectNumber,
    handleUndo,
    handleNewGame,
  };
};

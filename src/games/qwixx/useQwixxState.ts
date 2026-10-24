import { useReducer, useEffect, useState, useCallback, useRef } from 'react';
import { storage } from '../../lib/storage';
import { qwixxReducer, INITIAL_STATE } from './logic/qwixxReducer';
import { computeHighlightedNumbers } from './logic/diceHighlight';
import {
  getSheetDefinition,
  ALL_SHEET_TYPES,
  generateRandomSheetRows,
} from './logic/sheetDefinitions';
import type { DieKey } from './logic/diceHighlight';
import type {
  RowColor,
  DiceValues,
  PlayerSheet,
  QwixxSheetType,
  SheetRowDefinition,
} from './logic/types';

const STORAGE_KEY_SHEET = 'qwixx_my_sheet';
const STORAGE_KEY_SHOW_DICE = 'qwixx_show_dice';
const HIGHLIGHT_MS = 5000;

type Highlights = Partial<Record<RowColor, number[]>> | null;

/** State, persistence and handlers of the Qwixx sheet screen. */
export const useQwixxState = () => {
  const [state, dispatch] = useReducer(qwixxReducer, INITIAL_STATE, (initial) => {
    const savedSheet = storage.getJson<PlayerSheet | null>(STORAGE_KEY_SHEET, null);
    let mySheet = initial.mySheet;
    if (savedSheet && savedSheet.red && savedSheet.yellow && savedSheet.green && savedSheet.blue) {
      mySheet = {
        ...initial.mySheet,
        ...savedSheet,
        red: savedSheet.red?.crossed ? savedSheet.red : { crossed: [], isLocked: false },
        yellow: savedSheet.yellow?.crossed ? savedSheet.yellow : { crossed: [], isLocked: false },
        green: savedSheet.green?.crossed ? savedSheet.green : { crossed: [], isLocked: false },
        blue: savedSheet.blue?.crossed ? savedSheet.blue : { crossed: [], isLocked: false },
      };
    }
    return { ...initial, mySheet, roomId: '', isMultiplayer: false };
  });

  const [showDice, setShowDice] = useState<boolean>(
    () => storage.get(STORAGE_KEY_SHOW_DICE, 'false') === 'true',
  );
  const [selectedDie, setSelectedDie] = useState<DieKey | null>(null);
  const [highlightedNumbers, setHighlightedNumbers] = useState<Highlights>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    storage.setJson(STORAGE_KEY_SHEET, state.mySheet);
  }, [state.mySheet]);

  useEffect(() => {
    storage.set(STORAGE_KEY_SHOW_DICE, String(showDice));
  }, [showDice]);

  const clearHighlightTimer = useCallback(() => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearHighlightTimer, [clearHighlightTimer]);

  const clearHighlights = useCallback(() => {
    setSelectedDie(null);
    setHighlightedNumbers(null);
  }, []);

  const crossNumber = useCallback(
    (color: RowColor, number: number, isBonusRow?: boolean, rowId?: string) =>
      dispatch({ type: 'CROSS_NUMBER', color, number, isBonusRow, rowId }),
    [],
  );
  const lockRow = useCallback((color: RowColor) => dispatch({ type: 'LOCK_ROW', color }), []);
  const unlockRow = useCallback((color: RowColor) => dispatch({ type: 'UNLOCK_ROW', color }), []);
  const addMiss = useCallback(() => dispatch({ type: 'ADD_MISS' }), []);
  const removeMiss = useCallback(() => dispatch({ type: 'REMOVE_MISS' }), []);

  const selectSheet = useCallback(
    (sheetType: QwixxSheetType, presetIndex?: number, customRows?: SheetRowDefinition[]) => {
      dispatch({ type: 'CHANGE_SHEET_TYPE', sheetType, presetIndex, customRows });
      clearHighlights();
    },
    [clearHighlights],
  );

  const pickRandomSheet = useCallback(() => {
    const otherTypes = ALL_SHEET_TYPES.filter((type) => type !== state.mySheet.sheetType);
    const randomType =
      otherTypes[Math.floor(Math.random() * otherTypes.length)] || ALL_SHEET_TYPES[0];
    const def = getSheetDefinition(randomType);
    const randomPreset = def.presets ? Math.floor(Math.random() * def.presets.length) : 0;
    const customRows = randomType === 'random_mix' ? generateRandomSheetRows() : undefined;
    selectSheet(randomType, randomPreset, customRows);
  }, [state.mySheet.sheetType, selectSheet]);

  const roll = useCallback(
    (newDice: DiceValues) => {
      dispatch({ type: 'FINISH_ROLL', dice: newDice });
      clearHighlights();
      clearHighlightTimer();
    },
    [clearHighlights, clearHighlightTimer],
  );

  const clickDie = useCallback(
    (dieKey: DieKey) => {
      clearHighlightTimer();
      if (selectedDie === dieKey) {
        clearHighlights();
        return;
      }
      setSelectedDie(dieKey);
      setHighlightedNumbers(computeHighlightedNumbers(dieKey, state.dice, state.mySheet));
      highlightTimerRef.current = setTimeout(() => {
        clearHighlights();
        highlightTimerRef.current = null;
      }, HIGHLIGHT_MS);
    },
    [selectedDie, state.dice, state.mySheet, clearHighlights, clearHighlightTimer],
  );

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
    clearHighlights();
  }, [clearHighlights]);

  return {
    state,
    showDice,
    setShowDice,
    selectedDie,
    highlightedNumbers,
    crossNumber,
    lockRow,
    unlockRow,
    addMiss,
    removeMiss,
    selectSheet,
    pickRandomSheet,
    roll,
    clickDie,
    resetGame,
  };
};

import type { KnisterAction, KnisterPlayer, KnisterState, KnisterMoveHistoryEntry } from './types';
import { createEmptyGrid, calculateBoardScores } from './knisterScoring';
import { storage } from '../../../lib/storage';

const STORAGE_KEY_KNISTER_HIGHSCORE = 'knister_highscore';

export const INITIAL_PLAYER: KnisterPlayer = {
  id: 'p1',
  name: 'Player 1',
  grid: createEmptyGrid(),
  isFilled: false,
};

export const INITIAL_KNISTER_STATE: KnisterState = {
  players: [INITIAL_PLAYER],
  activePlayerIndex: 0,
  currentRoll: null,
  rollCount: 0,
  rollHistory: [],
  moveHistory: [],
  isRolling: false,
  isGameOver: false,
  highScore: Number(storage.get(STORAGE_KEY_KNISTER_HIGHSCORE, '0')) || 0,
};

export function knisterReducer(state: KnisterState, action: KnisterAction): KnisterState {
  switch (action.type) {
    case 'ROLL_DICE': {
      if (state.isGameOver || state.rollCount >= 25) return state;
      const sum = action.die1 + action.die2;
      const roll = { die1: action.die1, die2: action.die2, sum };
      return {
        ...state,
        currentRoll: roll,
        rollCount: state.rollCount + 1,
        rollHistory: [roll, ...state.rollHistory],
      };
    }

    case 'PLACE_NUMBER': {
      if (state.isGameOver) return state;
      const valToPlace = action.value ?? (state.currentRoll ? state.currentRoll.sum : null);
      if (valToPlace === null || valToPlace < 2 || valToPlace > 12) return state;

      const playerIndex = action.playerId
        ? state.players.findIndex((p) => p.id === action.playerId)
        : state.activePlayerIndex;

      if (playerIndex < 0 || playerIndex >= state.players.length) return state;
      const player = state.players[playerIndex];

      // If cell is already filled, ignore
      if (player.grid[action.row][action.col] !== null) return state;

      const newGrid = player.grid.map((rowArr, rIdx) =>
        rowArr.map((cell, cIdx) => (rIdx === action.row && cIdx === action.col ? valToPlace : cell)),
      );

      // Count filled cells
      let filledCount = 0;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (newGrid[r][c] !== null) filledCount++;
        }
      }

      const updatedPlayer: KnisterPlayer = {
        ...player,
        grid: newGrid,
        isFilled: filledCount >= 25,
      };

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = updatedPlayer;

      const hadVirtualRoll = state.currentRoll !== null;
      const newRollCount = hadVirtualRoll ? state.rollCount : state.rollCount + 1;
      const rollEntry = hadVirtualRoll
        ? state.currentRoll!
        : { die1: 0, die2: 0, sum: valToPlace };
      const newRollHistory = hadVirtualRoll
        ? state.rollHistory
        : [rollEntry, ...state.rollHistory];

      const moveEntry: KnisterMoveHistoryEntry = {
        row: action.row,
        col: action.col,
        value: valToPlace,
        playerId: player.id,
        previousRoll: state.currentRoll,
      };

      const isGameOver = updatedPlayers.every((p) => p.isFilled) || newRollCount >= 25;

      let newHighScore = state.highScore;
      if (isGameOver) {
        for (const p of updatedPlayers) {
          const score = calculateBoardScores(p.grid).totalScore;
          if (score > newHighScore) {
            newHighScore = score;
            storage.set(STORAGE_KEY_KNISTER_HIGHSCORE, String(score));
          }
        }
      }

      return {
        ...state,
        players: updatedPlayers,
        currentRoll: null, // Clear active roll once placed
        rollCount: newRollCount,
        rollHistory: newRollHistory,
        moveHistory: [...(state.moveHistory || []), moveEntry],
        isGameOver,
        highScore: newHighScore,
      };
    }

    case 'UNDO_MOVE': {
      if (!state.moveHistory || state.moveHistory.length === 0) return state;
      const lastMove = state.moveHistory[state.moveHistory.length - 1];
      const playerIndex = state.players.findIndex((p) => p.id === lastMove.playerId);
      if (playerIndex < 0) return state;

      const player = state.players[playerIndex];
      const newGrid = player.grid.map((rowArr, rIdx) =>
        rowArr.map((cell, cIdx) => (rIdx === lastMove.row && cIdx === lastMove.col ? null : cell)),
      );

      const updatedPlayer: KnisterPlayer = {
        ...player,
        grid: newGrid,
        isFilled: false,
      };

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = updatedPlayer;

      const restoredRoll = lastMove.previousRoll;
      const newRollCount = restoredRoll !== null ? state.rollCount : Math.max(0, state.rollCount - 1);
      const newRollHistory = restoredRoll !== null ? state.rollHistory : state.rollHistory.slice(1);

      return {
        ...state,
        players: updatedPlayers,
        currentRoll: restoredRoll,
        rollCount: newRollCount,
        rollHistory: newRollHistory,
        moveHistory: state.moveHistory.slice(0, -1),
        isGameOver: false,
      };
    }

    case 'NEW_GAME': {
      return {
        ...state,
        players: state.players.map((p) => ({
          ...p,
          grid: createEmptyGrid(),
          isFilled: false,
        })),
        activePlayerIndex: 0,
        currentRoll: null,
        rollCount: 0,
        rollHistory: [],
        moveHistory: [],
        isGameOver: false,
      };
    }

    case 'SET_PLAYERS': {
      const names = action.names.length > 0 ? action.names : ['Player 1'];
      return {
        ...state,
        players: names.map((name, idx) => ({
          id: `p${idx + 1}`,
          name,
          grid: createEmptyGrid(),
          isFilled: false,
        })),
        activePlayerIndex: 0,
        currentRoll: null,
        rollCount: 0,
        rollHistory: [],
        moveHistory: [],
        isGameOver: false,
      };
    }

    case 'SWITCH_PLAYER': {
      if (action.index >= 0 && action.index < state.players.length) {
        return {
          ...state,
          activePlayerIndex: action.index,
        };
      }
      return state;
    }

    default:
      return state;
  }
}


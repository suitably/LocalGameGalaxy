import type { KniffelAction, KniffelState, KniffelPlayer, KniffelScores } from './types';
import { generateUUID } from '../../../lib/uuid';

const createEmptyScores = (): KniffelScores => ({
  ones: null,
  twos: null,
  threes: null,
  fours: null,
  fives: null,
  sixes: null,
  three_of_a_kind: null,
  four_of_a_kind: null,
  full_house: null,
  small_straight: null,
  large_straight: null,
  kniffel: null,
  chance: null,
  kniffel_bonus: null,
});

export const INITIAL_KNIFFEL_STATE: KniffelState = {
  players: [
    { id: generateUUID(), name: 'Spieler 1', scores: createEmptyScores() },
    { id: generateUUID(), name: 'Spieler 2', scores: createEmptyScores() },
  ],
  activePlayerIndex: 0,
  dice: [1, 2, 3, 4, 5], // Initial display state
  heldDice: [false, false, false, false, false],
  rollCount: 0,
  isGameOver: false,
  moveHistory: [],
};

const checkGameOver = (players: KniffelPlayer[]): boolean => {
  return players.every(p => {
    const s = p.scores;
    // kniffel_bonus is optional, don't require it
    const requiredKeys: (keyof KniffelScores)[] = [
      'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
      'three_of_a_kind', 'four_of_a_kind', 'full_house', 'small_straight',
      'large_straight', 'kniffel', 'chance'
    ];
    return requiredKeys.every(k => s[k] !== null);
  });
};

export function kniffelReducer(state: KniffelState, action: KniffelAction): KniffelState {
  switch (action.type) {
    case 'ROLL_DICE': {
      if (state.rollCount >= 3) return state;
      return {
        ...state,
        dice: action.dice,
        rollCount: state.rollCount + 1,
      };
    }

    case 'TOGGLE_HOLD_DIE': {
      if (state.rollCount === 0 || state.rollCount >= 3) return state;
      const newHeld = [...state.heldDice];
      newHeld[action.index] = !newHeld[action.index];
      return { ...state, heldDice: newHeld };
    }

    case 'SCORE_CATEGORY': {
      // Removed rollCount === 0 check to allow manual entry
      const currentPlayer = state.players[state.activePlayerIndex];
      const isBonus = action.category === 'kniffel_bonus';

      let newScoreValue: number;
      const previousScore = currentPlayer.scores[action.category];

      if (isBonus) {
         // Kniffel bonus is special, it increments
         newScoreValue = (previousScore || 0) + 1;
      } else {
        // Now allows overwriting: removing the check for !== null
        newScoreValue = action.score;
      }

      const newPlayers = [...state.players];
      newPlayers[state.activePlayerIndex] = {
        ...currentPlayer,
        scores: {
          ...currentPlayer.scores,
          [action.category]: newScoreValue,
        }
      };

      const isOver = checkGameOver(newPlayers);

      // Auto-switch to next player if game isn't over, unless it was just a bonus points addition
      let nextPlayerIndex = state.activePlayerIndex;
      if (!isOver && !isBonus) {
        nextPlayerIndex = (state.activePlayerIndex + 1) % newPlayers.length;
      }

      return {
        ...state,
        players: newPlayers,
        activePlayerIndex: nextPlayerIndex,
        dice: [1, 2, 3, 4, 5],
        heldDice: [false, false, false, false, false],
        rollCount: 0,
        isGameOver: isOver,
        moveHistory: [
          ...state.moveHistory,
          {
            playerIndex: state.activePlayerIndex,
            category: action.category,
            previousScore,
            previousActivePlayerIndex: state.activePlayerIndex,
            previousDice: [...state.dice],
            previousHeldDice: [...state.heldDice],
            previousRollCount: state.rollCount,
          }
        ]
      };
    }

    case 'UNDO_MOVE': {
      if (state.moveHistory.length === 0) return state;

      const lastMove = state.moveHistory[state.moveHistory.length - 1];
      const newHistory = state.moveHistory.slice(0, -1);

      const newPlayers = [...state.players];
      const player = newPlayers[lastMove.playerIndex];
      newPlayers[lastMove.playerIndex] = {
        ...player,
        scores: {
          ...player.scores,
          [lastMove.category]: lastMove.previousScore,
        }
      };

      return {
        ...state,
        players: newPlayers,
        activePlayerIndex: lastMove.previousActivePlayerIndex,
        dice: lastMove.previousDice,
        heldDice: lastMove.previousHeldDice,
        rollCount: lastMove.previousRollCount,
        isGameOver: false, // if we undo, the game cannot be over
        moveHistory: newHistory,
      };
    }

    case 'SET_PLAYERS': {
      return {
        ...state,
        players: action.names.map(name => ({
          id: generateUUID(),
          name,
          scores: createEmptyScores(),
        })),
        activePlayerIndex: 0,
        dice: [1, 2, 3, 4, 5],
        heldDice: [false, false, false, false, false],
        rollCount: 0,
        isGameOver: false,
        moveHistory: [],
      };
    }

    case 'SWITCH_PLAYER': {
      return {
        ...state,
        activePlayerIndex: action.index,
      };
    }

    case 'NEW_GAME': {
      return {
        ...state,
        players: state.players.map(p => ({
          ...p,
          scores: createEmptyScores(),
        })),
        activePlayerIndex: 0,
        dice: [1, 2, 3, 4, 5],
        heldDice: [false, false, false, false, false],
        rollCount: 0,
        isGameOver: false,
        moveHistory: [],
      };
    }

    default:
      return state;
  }
}

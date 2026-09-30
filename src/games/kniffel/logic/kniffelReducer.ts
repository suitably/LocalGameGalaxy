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
      if (isBonus) {
         // Kniffel bonus is special, it increments
         newScoreValue = (currentPlayer.scores.kniffel_bonus || 0) + 1;
      } else {
        if (currentPlayer.scores[action.category] !== null) return state; // Already scored
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
      };
    }

    default:
      return state;
  }
}

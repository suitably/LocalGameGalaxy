/**
 * Storyteller live in a party room: pure reducer for `useRoomReducer` [ID: LOGIC-STORY-ROOM]
 *
 * The room's players write in seat order; the party host applies the actions (#647 S7). The
 * story lives in memory only ("Play over days" keeps the stored, push-notified stories).
 */
import { DEFAULT_MODIFIER_SETTINGS, evaluateRouletteWords } from './modifiers';
import { getRandomWords } from './storyLexicon';
import type { StoryEntry, StoryGameRecord } from '../types';

export interface StoryRoomState {
  hostId: string;
  game: StoryGameRecord | null;
  entries: StoryEntry[];
}

export type StoryRoomAction =
  | { type: 'start'; players: { id: string; name: string }[]; language: string }
  | { type: 'submit'; text: string; timeSpentSeconds?: number }
  | { type: 'finish' };

export const initialStoryRoom = (hostId: string): StoryRoomState => ({
  hostId,
  game: null,
  entries: [],
});

/** The player whose turn it is. */
export const storyActorId = (state: StoryRoomState): string | undefined =>
  state.game?.status === 'writing'
    ? state.game.players[state.game.currentPlayerIndex]?.id
    : undefined;

export function storyRoomAllows(
  state: StoryRoomState,
  action: StoryRoomAction,
  from: string,
): boolean {
  switch (action.type) {
    case 'start':
      return from === state.hostId && action.players.length >= 2;
    case 'submit':
      return storyActorId(state) === from;
    case 'finish':
      return (
        state.game?.status === 'writing' && (storyActorId(state) === from || from === state.hostId)
      );
  }
}

export function storyRoomReducer(state: StoryRoomState, action: StoryRoomAction): StoryRoomState {
  if (action.type === 'start') {
    if (state.game) return state;
    const at = new Date().toISOString();
    const modifiers = DEFAULT_MODIFIER_SETTINGS;
    const game: StoryGameRecord = {
      id: 'live',
      type: 'local',
      status: 'writing',
      turnNumber: 1,
      createdAt: at,
      updatedAt: at,
      players: action.players.map(({ id, name }) => ({ id, name })),
      currentPlayerIndex: 0,
      options: { language: action.language, modifiers },
      currentRequiredWords: modifiers.wordRoulette.enabled
        ? getRandomWords(action.language, modifiers.wordRoulette.wordsPerTurn)
        : undefined,
      statistics: { totalWords: 0, totalTurns: 0 },
    };
    return { ...state, game };
  }

  const { game } = state;
  if (!game || game.status !== 'writing') return state;

  if (action.type === 'finish') {
    return { ...state, game: { ...game, status: 'completed' } };
  }

  const text = action.text.trim();
  if (!text) return state;
  const roulette = game.options.modifiers.wordRoulette;
  if (
    roulette.enabled &&
    game.currentRequiredWords &&
    evaluateRouletteWords(text, game.currentRequiredWords).some((w) => !w.matched)
  ) {
    return state;
  }

  const author = game.players[game.currentPlayerIndex];
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const at = new Date().toISOString();
  const entry: StoryEntry = {
    id: `live-${game.turnNumber}`,
    gameId: game.id,
    turnNumber: game.turnNumber,
    authorId: author.id,
    authorName: author.name,
    text,
    wordCount,
    submittedAt: at,
    requiredWords: game.currentRequiredWords,
    timeSpentSeconds: action.timeSpentSeconds,
  };
  return {
    ...state,
    entries: [...state.entries, entry],
    game: {
      ...game,
      updatedAt: at,
      turnNumber: game.turnNumber + 1,
      currentPlayerIndex: (game.currentPlayerIndex + 1) % game.players.length,
      currentRequiredWords: roulette.enabled
        ? getRandomWords(game.options.language, roulette.wordsPerTurn, game.currentRequiredWords)
        : undefined,
      statistics: {
        totalWords: (game.statistics?.totalWords ?? 0) + wordCount,
        totalTurns: (game.statistics?.totalTurns ?? 0) + 1,
      },
    },
  };
}

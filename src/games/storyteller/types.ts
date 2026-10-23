import type { StoredPushSubscription } from '../../lib/push/pushTypes';
import type { PlayerSeat } from '../../modules/player-management';

export interface StoryPlayer {
  id: string;
  name: string;
  isRemote?: boolean;
  relayUrl?: string;
  ntfyTopic?: string;
  notificationMethod?: 'auto' | 'webpush' | 'ntfy' | 'both';
  /** Web Push subscription of the device playing this player. */
  webPush?: StoredPushSubscription;
  /** Which device plays this player (`modules/player-management/playerSeats.ts`). */
  seat?: PlayerSeat;
}

export interface BlindModeSettings {
  enabled: boolean;
  visibleWordCount: number;
}

export interface TimeAttackSettings {
  enabled: boolean;
  timeLimitSeconds: number;
}

export interface WordRouletteSettings {
  enabled: boolean;
  wordsPerTurn: number;
}

export interface StoryModifierSettings {
  blindMode: BlindModeSettings;
  timeAttack: TimeAttackSettings;
  wordRoulette: WordRouletteSettings;
}

export interface StoryEntry {
  id: string;
  gameId: string;
  turnNumber: number;
  authorId: string;
  authorName: string;
  text: string;
  wordCount: number;
  submittedAt: string;
  requiredWords?: string[];
  timeSpentSeconds?: number;
}

export interface StoryGameOptions {
  language: string;
  modifiers: StoryModifierSettings;
}

export interface StoryGameRecord {
  id: string;
  name?: string;
  type: 'local';
  status: 'writing' | 'completed';
  turnNumber: number;
  createdAt: string;
  updatedAt: string;
  players: StoryPlayer[];
  currentPlayerIndex: number;
  options: StoryGameOptions;
  currentRequiredWords?: string[];
  statistics?: {
    totalWords: number;
    totalTurns: number;
  };
}

export interface StoryGameSnapshot {
  game: StoryGameRecord;
  entries: StoryEntry[];
}

export interface StoryContextView {
  isBlind: boolean;
  text: string;
  precedingAuthorName?: string;
  precedingTurnNumber?: number;
  fullHistoryAvailable: boolean;
}

export interface WordRouletteWordCheck {
  word: string;
  matched: boolean;
}

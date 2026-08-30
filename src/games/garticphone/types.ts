export type GarticPhase = 'lobby' | 'prompt' | 'drawing' | 'guessing' | 'reveal' | 'finished';

export interface GarticPlayer {
  id: string;
  name: string;
  avatar?: string;
  isHost?: boolean;
  ready?: boolean;
}

export interface GarticStep {
  type: 'prompt' | 'drawing';
  authorId: string;
  authorName: string;
  content: string; // text string for prompt/guess, or Excalidraw JSON string for drawing
  timestamp: number;
  roundIndex?: number;
}

export interface GarticBook {
  ownerId: string;
  ownerName: string;
  steps: GarticStep[];
}

export interface GarticSettings {
  drawTimeSeconds: number;
  guessTimeSeconds: number;
}

export interface GarticGameState {
  id: string;
  roomId: string;
  hostId: string;
  phase: GarticPhase;
  roundIndex: number;
  totalRounds: number;
  players: GarticPlayer[];
  books: GarticBook[];
  assignments?: Record<string, string>;
  currentRevealBookIndex: number;
  currentRevealStepIndex: number;
  settings: GarticSettings;
}

export type GarticAction =
  | { type: 'JOIN_LOBBY'; player: GarticPlayer }
  | { type: 'LEAVE_LOBBY'; playerId: string }
  | { type: 'START_GAME' }
  | { type: 'SUBMIT_STEP'; playerId: string; step: GarticStep }
  | { type: 'NEXT_REVEAL_STEP' }
  | { type: 'PREV_REVEAL_STEP' }
  | { type: 'NEXT_REVEAL_BOOK' }
  | { type: 'RESTART_GAME' }
  | { type: 'SYNC_STATE'; state: GarticGameState };

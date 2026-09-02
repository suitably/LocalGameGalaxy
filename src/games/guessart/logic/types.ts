export type GameStatus = 'selecting' | 'drawing' | 'guessing' | 'completed';

export interface PlayerIdentity {
  id: string;
  name: string;
  isRemote?: boolean;
}

export interface WordTranslationEntry {
  canonical: string;
  synonyms: string[];
  forms?: string[];
  gendered?: string[];
}

export interface WordItem {
  id: string | number;
  categoryId?: string | number;
  word: string;
  difficulty?: number;
  translations?: Record<string, WordTranslationEntry>;
}

export interface CategoryItem {
  id: string | number;
  name: string;
  translations?: {
    languageCode: string;
    name: string;
  }[];
}

export interface GuessArtRound {
  id: string;
  gameId: string;
  roundNumber: number;
  drawnById: string;
  drawnByName?: string;
  guesserId?: string;
  guesserName?: string;
  drawerIsCurrentPlayer?: boolean;
  status: GameStatus;
  word: string;
  wordId?: string | number | null;
  wordLanguageCode: string;
  wordDifficulty: number;
  wordCategoryId?: string | number | null;
  translations: Record<string, WordTranslationEntry>;
  guesses: string[];
  guess?: string;
  hintLevel: number;
  hintRequested: boolean;
  hintLetters: string[];
  wordMask: string[];
  wordLength: number;
  canvasData: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface GameOptions {
  language: string;
  manualWordMode: boolean;
  categoryIds?: (string | number)[];
  ownerId?: string | null;
}

export interface GuessArtGameRecord {
  id: string;
  name?: string;
  type: 'local';
  status: GameStatus;
  roundNumber: number;
  createdAt: string;
  updatedAt: string;
  players: PlayerIdentity[];
  currentPlayerIndex: number;
  options: GameOptions;
  statistics?: {
    roundsCompleted: number;
  };
}

export interface GameSnapshot {
  game: GuessArtGameRecord;
  round: GuessArtRound | null;
}

export interface SelectWordPayload {
  word: string;
  wordId?: string | number;
  categoryId?: string | number;
  languageCode?: string;
  difficulty?: number;
  translations?: Record<string, WordTranslationEntry>;
}

export interface HintResult {
  type: 'structure' | 'letters';
  structure: string[];
  letters: string[];
  level: number;
  wordLength: number;
}

export interface MasterCatalogue {
  id: string;
  version: number;
  updatedAt: string;
  categories: CategoryItem[];
  words: WordItem[];
}

export interface CatalogueDiffSummary {
  addedCategories: CategoryItem[];
  modifiedCategories: CategoryItem[];
  deletedCategories: CategoryItem[];
  addedWords: WordItem[];
  modifiedWords: WordItem[];
  deletedWords: WordItem[];
  totalChanges: number;
}

export interface PublishCatalogueResult {
  success: boolean;
  prUrl: string;
  prNumber: number;
  branch?: string;
  updated?: boolean;
}

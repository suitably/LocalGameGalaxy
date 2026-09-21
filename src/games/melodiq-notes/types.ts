export interface DemoSong {
    id: string;
    title: string;
    artist: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    xmlContent: string;
    baseBpm?: number;
}

export const DIFFICULTY_COLORS: Record<DemoSong['difficulty'], string> = {
    Easy: '#4caf50',
    Medium: '#ff9800',
    Hard: '#f44336',
};

export type PlayMode = 'continuous' | 'wait';
export type InputSource = 'midi' | 'mic';

export interface OsmdPitch {
    fundamentalNote?: number;
    octave?: number;
    halfTone?: number;
    getHalfTone?: () => number;
}

// Re-export for convenience so other files in this game only import from types.ts
export type { StoredSheetMusic, StoredFolderHandle } from './logic/db';

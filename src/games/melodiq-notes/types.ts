export type StemType = 'drums' | 'bass' | 'instrument' | 'vocals' | 'other';

export interface DemoSong {
    id: string;
    title: string;
    artist: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    xmlContent: string;
    baseBpm?: number;
    stems?: Partial<Record<StemType, string>>;
    sync_offset_ms?: number;
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

export type InstrumentCategory = 'flute' | 'guitar' | 'bass' | 'strings' | 'drums' | 'piano' | 'other';

export interface ScorePartInfo {
    id: string;
    name: string;
    instrumentName: string;
    midiProgram?: number;
    midiChannel?: number;
    color: string;
    category: InstrumentCategory;
}

export interface InstrumentMixerChannel {
    partId: string;
    volume: number; // 0 to 1
    muted: boolean;
    solo: boolean;
    customSampleUrl?: string;
    soundPreset?: string;
}

export type MelodiqNotesViewMode = 'classic' | 'modern';
export type ModernViewSubMode = 'focus' | 'ensemble';

export interface TimelineNote {
    id: string;
    pitch: number;
    noteName: string;
    startBeats: number;
    durationBeats: number;
    isRest: boolean;
    partId: string;
    color: string;
}

export interface TimelineTrack {
    part: ScorePartInfo;
    notes: TimelineNote[];
}

// Re-export for convenience so other files in this game only import from types.ts
export type { StoredSheetMusic, StoredFolderHandle } from './logic/db';
export type { TargetNote } from './useNoteVerifier';

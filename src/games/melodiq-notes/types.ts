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

/** Soundfont family used to voice an instrument. */
export type InstrumentCategory =
  'flute' | 'guitar' | 'bass' | 'strings' | 'drums' | 'piano' | 'other';

export interface ScorePartInfo {
  id: string;
  name: string;
  instrumentName: string;
  midiProgram?: number;
  midiChannel?: number;
  color: string;
  category: InstrumentCategory;
}

export type { StoredSheetMusic, StoredFolderHandle } from './logic/db';

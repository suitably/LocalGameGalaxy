export interface DemoSong {
  id: string;
  title: string;
  artist: string;
  xmlContent: string;
  baseBpm?: number;
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

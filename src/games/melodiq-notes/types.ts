import type { InstrumentCategory } from '../../modules/audio/synth';

export type { InstrumentCategory };

export interface DemoSong {
  id: string;
  title: string;
  artist: string;
  xmlContent: string;
  baseBpm?: number;
}

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

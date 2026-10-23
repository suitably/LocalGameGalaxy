import type { InstrumentKind } from '../../../../modules/music-score';
import type { InstrumentCategory } from '../../types';

export type StageView = 'keys' | 'strings' | 'drums' | 'pitch';

export interface StageInstrument {
  kind: InstrumentKind;
  view: StageView;
  color: string;
  /** Soundfont category used for this instrument's notes. */
  sound: InstrumentCategory;
}

/** Stage colours; canvas drawing cannot use MUI theme tokens, so the palette lives here. */
export const STAGE_INSTRUMENTS: Record<InstrumentKind, StageInstrument> = {
  keyboard: { kind: 'keyboard', view: 'keys', color: '#5ad1ff', sound: 'piano' },
  guitar: { kind: 'guitar', view: 'strings', color: '#ffb547', sound: 'guitar' },
  bass: { kind: 'bass', view: 'strings', color: '#a98bff', sound: 'bass' },
  ukulele: { kind: 'ukulele', view: 'strings', color: '#7be3a5', sound: 'guitar' },
  drums: { kind: 'drums', view: 'drums', color: '#ff6b5e', sound: 'drums' },
  vocals: { kind: 'vocals', view: 'pitch', color: '#ff6fb1', sound: 'flute' },
  melody: { kind: 'melody', view: 'pitch', color: '#ffa36b', sound: 'flute' },
};

export const INSTRUMENT_ORDER: InstrumentKind[] = [
  'keyboard',
  'guitar',
  'bass',
  'drums',
  'ukulele',
  'vocals',
  'melody',
];

export const STRING_COLORS = ['#ff5c7a', '#ffd36b', '#5ad1ff', '#ff9f4a', '#7be3a5', '#b48cff'];

/** Drum lanes left to right (see DRUM_LANES in music-score); `key` is the computer-keyboard fallback. */
export const DRUM_LANE_META = [
  { id: 'cymbal', key: 'D', code: 'KeyD', color: '#ffd36b' },
  { id: 'hihat', key: 'F', code: 'KeyF', color: '#5ad1ff' },
  { id: 'snare', key: 'J', code: 'KeyJ', color: '#ff6b5e' },
  { id: 'tom', key: 'K', code: 'KeyK', color: '#7be3a5' },
  { id: 'kick', key: '␣', code: 'Space', color: '#ff9f4a' },
] as const;

export const JUDGEMENT_COLORS = { perfect: '#ffd36b', good: '#5ad1ff', miss: '#ff5c7a' } as const;

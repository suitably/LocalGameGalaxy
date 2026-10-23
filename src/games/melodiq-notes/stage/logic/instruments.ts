import type { InstrumentKind } from '../../../../modules/music-score';
import type { InstrumentCategory } from '../../types';
import { darkTokens, piecePalette } from '../../../../themeTokens';

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
  keyboard: { kind: 'keyboard', view: 'keys', color: piecePalette.blue, sound: 'piano' },
  guitar: { kind: 'guitar', view: 'strings', color: piecePalette.orange, sound: 'guitar' },
  bass: { kind: 'bass', view: 'strings', color: piecePalette.purple, sound: 'bass' },
  ukulele: { kind: 'ukulele', view: 'strings', color: piecePalette.green, sound: 'guitar' },
  drums: { kind: 'drums', view: 'drums', color: piecePalette.red, sound: 'drums' },
  vocals: { kind: 'vocals', view: 'pitch', color: piecePalette.pink, sound: 'flute' },
  melody: { kind: 'melody', view: 'pitch', color: piecePalette.teal, sound: 'flute' },
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

export const STRING_COLORS = [
  piecePalette.red,
  piecePalette.yellow,
  piecePalette.blue,
  piecePalette.orange,
  piecePalette.green,
  piecePalette.purple,
];

/** Drum lanes left to right (see DRUM_LANES in music-score); `key` is the computer-keyboard fallback. */
export const DRUM_LANE_META = [
  { id: 'cymbal', key: 'D', code: 'KeyD', color: piecePalette.yellow },
  { id: 'hihat', key: 'F', code: 'KeyF', color: piecePalette.blue },
  { id: 'snare', key: 'J', code: 'KeyJ', color: piecePalette.red },
  { id: 'tom', key: 'K', code: 'KeyK', color: piecePalette.green },
  { id: 'kick', key: '␣', code: 'Space', color: piecePalette.orange },
] as const;

export const JUDGEMENT_COLORS = {
  perfect: darkTokens.primary.main,
  good: darkTokens.accent.main,
  miss: darkTokens.error,
} as const;

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

/**
 * Drum lanes left to right (index = DRUM_LANES in music-score). Toms 1–3 and the floor tom are told
 * apart by colour, so a fill moving across the kit reads at a glance; percussion is a muted lane.
 */
export const DRUM_LANE_META = [
  { id: 'cymbal', color: piecePalette.yellow },
  { id: 'hihat', color: piecePalette.blue },
  { id: 'snare', color: piecePalette.red },
  { id: 'tom1', color: piecePalette.green },
  { id: 'tom2', color: piecePalette.teal },
  { id: 'tom3', color: piecePalette.purple },
  { id: 'floorTom', color: piecePalette.pink },
  { id: 'percussion', color: darkTokens.text.secondary },
  { id: 'kick', color: piecePalette.orange },
] as const;

/** Instruments shown on the Melodiq Notes settings page with their General MIDI defaults. */
export const INSTRUMENT_LIST = [
  {
    id: 'flute',
    name: 'Flute / Alto Flute',
    category: 'flute' as const,
    defaultMidi: 74,
    previewPitch: 74,
  },
  {
    id: 'guitar_clean',
    name: 'Electric Guitar (Clean)',
    category: 'guitar' as const,
    defaultMidi: 28,
    previewPitch: 52,
  },
  {
    id: 'guitar_dist',
    name: 'Electric Guitar (Distortion)',
    category: 'guitar' as const,
    defaultMidi: 31,
    previewPitch: 52,
  },
  {
    id: 'guitar_acoustic',
    name: 'Acoustic Guitar',
    category: 'guitar' as const,
    defaultMidi: 26,
    previewPitch: 52,
  },
  {
    id: 'bass',
    name: 'Electric Bass',
    category: 'bass' as const,
    defaultMidi: 34,
    previewPitch: 40,
  },
  {
    id: 'strings',
    name: 'Violins / Strings',
    category: 'strings' as const,
    defaultMidi: 49,
    previewPitch: 69,
  },
  {
    id: 'piano',
    name: 'Acoustic Grand Piano',
    category: 'piano' as const,
    defaultMidi: 1,
    previewPitch: 60,
  },
  {
    id: 'drums',
    name: 'Drums / Percussion',
    category: 'drums' as const,
    defaultMidi: 119,
    previewPitch: 36,
  },
];

export type InstrumentPreset = (typeof INSTRUMENT_LIST)[number];

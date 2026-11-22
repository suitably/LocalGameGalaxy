import type { DrumVoice } from '../../../../modules/music-score';

/**
 * Short, language-neutral mark drawn on a drum note, so a lane that holds several sounds (cymbals,
 * snare strokes, percussion) also shows which one is meant. Plain strokes get none. Colour and fill
 * carry the rest (#571): each tom has its own lane and colour (also on the pult's single tom pad),
 * a closed hi-hat is a filled note and an open one a hollow note.
 */
export const DRUM_GLYPH: Partial<Record<DrumVoice, string>> = {
  snareRimshot: 'RS',
  snareCrossStick: 'x',
  snareGhost: '(•)',
  hihatPedal: 'ped',
  crash: 'Cr',
  ride: 'Rd',
  rideBell: 'Bell',
  china: 'Ch',
  splash: 'Sp',
  cowbell: 'Cb',
  tambourine: 'Tb',
  // any other percussion (clap, shaker, ...) on the percussion lane
  other: 'Pc',
};

import type { DrumVoice } from '../../../../modules/music-score';

/**
 * Short, language-neutral mark drawn on a drum note, so the pad lane (hi-hat,
 * snare, tom, cymbal, kick) also shows which sound is meant. Plain strokes get none.
 */
export const DRUM_GLYPH: Partial<Record<DrumVoice, string>> = {
  snareRimshot: 'RS',
  snareCrossStick: 'x',
  snareGhost: '(•)',
  hihatClosed: '+',
  hihatOpen: 'o',
  hihatPedal: 'ped',
  tom1: '1',
  tom2: '2',
  tom3: '3',
  floorTom: 'F',
  crash: 'Cr',
  ride: 'Rd',
  rideBell: 'Bell',
  china: 'Ch',
  splash: 'Sp',
  cowbell: 'Cb',
};

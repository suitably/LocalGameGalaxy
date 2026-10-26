/** Every drum or percussion sound a score can name; finer than the stage lanes. */
export const DRUM_VOICES = [
  'kick',
  'snare',
  'snareRimshot',
  'snareCrossStick',
  'snareGhost',
  'hihatClosed',
  'hihatOpen',
  'hihatPedal',
  'tom1',
  'tom2',
  'tom3',
  'floorTom',
  'crash',
  'ride',
  'rideBell',
  'china',
  'splash',
  'cowbell',
  'tambourine',
  'other',
] as const;
export type DrumVoice = (typeof DRUM_VOICES)[number];

export type DrumFamily = 'kick' | 'snare' | 'hihat' | 'tom' | 'cymbal' | 'other';

export const GM_DRUM_MIN = 35;
export const GM_DRUM_MAX = 81;

const GM_VOICES: Record<number, DrumVoice> = {
  // Roland V-Drums hi-hat bow is 42/46, its edge 22 (closed) and 26 (open)
  22: 'hihatClosed',
  26: 'hihatOpen',
  35: 'kick',
  36: 'kick',
  37: 'snareCrossStick',
  38: 'snare',
  40: 'snare',
  41: 'floorTom',
  42: 'hihatClosed',
  43: 'floorTom',
  44: 'hihatPedal',
  45: 'tom3',
  46: 'hihatOpen',
  47: 'tom2',
  48: 'tom1',
  49: 'crash',
  50: 'tom1',
  51: 'ride',
  52: 'china',
  53: 'rideBell',
  55: 'splash',
  54: 'tambourine',
  56: 'cowbell',
  57: 'crash',
  59: 'ride',
};

/** The General MIDI key written for a voice (used when the score only names the sound). */
export const DRUM_VOICE_KEY: Record<DrumVoice, number> = {
  kick: 36,
  snare: 38,
  snareRimshot: 38,
  snareCrossStick: 37,
  snareGhost: 38,
  hihatClosed: 42,
  hihatOpen: 46,
  hihatPedal: 44,
  tom1: 50,
  tom2: 47,
  tom3: 45,
  floorTom: 43,
  crash: 49,
  ride: 51,
  rideBell: 53,
  china: 52,
  splash: 55,
  cowbell: 56,
  tambourine: 54,
  other: 39,
};

/** General MIDI percussion key (35-81, plus the V-Drums hi-hat edge) to voice; anything else is `other`. */
export function drumVoiceOfKey(key: number): DrumVoice {
  return GM_VOICES[key] ?? 'other';
}

export function drumFamilyOf(voice: DrumVoice): DrumFamily {
  switch (voice) {
    case 'kick':
      return 'kick';
    case 'snare':
    case 'snareRimshot':
    case 'snareCrossStick':
    case 'snareGhost':
      return 'snare';
    case 'hihatClosed':
    case 'hihatOpen':
    case 'hihatPedal':
      return 'hihat';
    case 'tom1':
    case 'tom2':
    case 'tom3':
    case 'floorTom':
      return 'tom';
    case 'crash':
    case 'ride':
    case 'rideBell':
    case 'china':
    case 'splash':
      return 'cymbal';
    default:
      return 'other';
  }
}

/**
 * How well a played voice fits a written one: 0 exact, 1 same instrument
 * (any hi-hat for hi-hat, any snare stroke for snare, any tom for a tom,
 * any cymbal for a cymbal), 2 otherwise. Callers prefer the lower number.
 */
export function drumMatchRank(played: DrumVoice, expected: DrumVoice): 0 | 1 | 2 {
  if (played === expected) return 0;
  const f = drumFamilyOf(played);
  return f !== 'other' && f === drumFamilyOf(expected) ? 1 : 2;
}

/** Name of a score instrument ("Hi-Hat (open)", "Ride Bell", "Floor Tom") to a voice, or null. */
export function drumVoiceOfName(name: string): DrumVoice | null {
  const n = name.toLowerCase().replace(/[-_]/g, ' ');
  if (/cow ?bell/.test(n)) return 'cowbell';
  if (/tambo?urin/.test(n)) return 'tambourine';
  if (/rim ?shot/.test(n)) return 'snareRimshot';
  if (/side ?stick|cross ?stick|rim click/.test(n)) return 'snareCrossStick';
  if (/ghost/.test(n)) return 'snareGhost';
  if (/snare|caisse/.test(n)) return 'snare';
  if (/hi ?hat/.test(n)) {
    if (/pedal|foot/.test(n)) return 'hihatPedal';
    return /open/.test(n) ? 'hihatOpen' : 'hihatClosed';
  }
  if (/ride/.test(n)) return /bell/.test(n) ? 'rideBell' : 'ride';
  if (/china/.test(n)) return 'china';
  if (/splash/.test(n)) return 'splash';
  if (/crash|cymbal/.test(n)) return 'crash';
  if (/floor/.test(n)) return 'floorTom';
  const tom = /\btom ?([1-4])?/.exec(n);
  if (tom) {
    if (/\bhigh\b|\bhi\b/.test(n) || tom[1] === '1') return 'tom1';
    if (/\bmid/.test(n) || tom[1] === '2') return 'tom2';
    if (/\blow\b/.test(n) || tom[1] === '3') return 'tom3';
    if (tom[1] === '4') return 'floorTom';
    return 'tom2';
  }
  if (/kick|bass drum/.test(n)) return 'kick';
  return null;
}

/** What one unpitched MusicXML note says about its sound, besides the instrument. */
export interface DrumNoteHints {
  /** General MIDI key from `<midi-unpitched>`, when the part list gives one. */
  key?: number | null;
  /** `<instrument-name>` of the note's instrument. */
  name?: string | null;
  /** `<notehead>` value (x, circle-x, diamond, ...). */
  notehead?: string | null;
  /** Notehead in parentheses (ghost note). */
  parenthesized?: boolean;
  /** `<technical><open/>` (hi-hat open, "o"). */
  open?: boolean;
  /** `<technical><stopped/>` (hi-hat closed, "+"). */
  stopped?: boolean;
  /** Free text of `<other-technical>` or `<words>` such as "rimshot". */
  mark?: string | null;
}

/** Combines instrument, notehead and articulations of a MusicXML drum note into one voice. */
export function resolveDrumVoice(h: DrumNoteHints): DrumVoice | null {
  const fromKey = h.key != null && h.key >= GM_DRUM_MIN && h.key <= GM_DRUM_MAX;
  let base: DrumVoice | null = fromKey ? drumVoiceOfKey(h.key as number) : null;
  const named = h.name ? drumVoiceOfName(h.name) : null;
  if (!base || base === 'other') base = named ?? base;
  else if (named === 'snareRimshot' && drumFamilyOf(base) === 'snare') base = named;
  else if (named === 'rideBell' && base === 'ride') base = named;
  if (!base) return null;
  const head = (h.notehead ?? '').toLowerCase();
  const mark = (h.mark ?? '').toLowerCase();
  const family = drumFamilyOf(base);
  if (family === 'hihat') {
    if (h.open || head === 'circle-x') return 'hihatOpen';
    if (h.stopped && base === 'hihatOpen') return 'hihatClosed';
    return base;
  }
  if (family === 'snare') {
    if (/rim ?shot/.test(mark)) return 'snareRimshot';
    if (base === 'snare' && (head === 'x' || /cross|side/.test(mark))) return 'snareCrossStick';
    if (base === 'snare' && h.parenthesized) return 'snareGhost';
    return base;
  }
  if (base === 'ride' && (head === 'diamond' || /bell/.test(mark))) return 'rideBell';
  return base;
}

export type Hand = 'R' | 'L';

/** "R" or "L" (any case) from a fingering or lyric text; anything else is not sticking. */
export function parseSticking(raw: string | null | undefined): Hand | null {
  const t = (raw ?? '').trim().toUpperCase();
  return t === 'R' || t === 'L' ? t : null;
}

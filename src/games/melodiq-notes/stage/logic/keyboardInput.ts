import { DRUM_LANE_META, type StageView } from './instruments';

const KEY_OFFSETS: Record<string, number> = {
  KeyA: 0,
  KeyW: 1,
  KeyS: 2,
  KeyE: 3,
  KeyD: 4,
  KeyF: 5,
  KeyT: 6,
  KeyG: 7,
  KeyY: 8,
  KeyZ: 8,
  KeyH: 9,
  KeyU: 10,
  KeyJ: 11,
  KeyK: 12,
};

export type KeyAction =
  | { kind: 'lane'; lane: number }
  | { kind: 'pitchStep'; delta: number }
  | { kind: 'sing'; on: boolean }
  | null;

/**
 * Computer-keyboard stand-in for an instrument (physical key codes, so it works on QWERTZ and QWERTY):
 * keys A–K play an octave, digits pick strings, D F J K Space hit drums, arrows and Space sing.
 */
export function keyAction(
  code: string,
  view: StageView,
  octaveBase: number,
  stringCount: number,
  down: boolean,
): KeyAction {
  if (view === 'pitch') {
    if (code === 'Space') return { kind: 'sing', on: down };
    if (down && (code === 'ArrowUp' || code === 'ArrowDown'))
      return { kind: 'pitchStep', delta: code === 'ArrowUp' ? 1 : -1 };
    return null;
  }
  if (!down) return null;
  if (view === 'keys' && KEY_OFFSETS[code] !== undefined)
    return { kind: 'lane', lane: octaveBase + KEY_OFFSETS[code] };
  if (view === 'strings') {
    const m = /^Digit([1-6])$/.exec(code);
    const i = m ? Number(m[1]) - 1 : -1;
    return i >= 0 && i < stringCount ? { kind: 'lane', lane: i } : null;
  }
  if (view === 'drums') {
    const lane = DRUM_LANE_META.findIndex((d) => d.code === code);
    return lane >= 0 ? { kind: 'lane', lane } : null;
  }
  return null;
}

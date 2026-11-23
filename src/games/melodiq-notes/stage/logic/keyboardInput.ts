import { DEFAULT_DRUM_PADS, drumLaneOfKey } from './drumLanes';
import type { StageView } from './instruments';

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
 * keys A–K play an octave, digits pick strings, D F J K L ; ' G Space hit drums (the tom keys play
 * the shown toms left to right, see drumLanes), arrows and Space sing.
 */
export function keyAction(
  code: string,
  view: StageView,
  octaveBase: number,
  stringCount: number,
  down: boolean,
  drumPads: readonly number[] = DEFAULT_DRUM_PADS,
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
    const lane = drumLaneOfKey(code, drumPads);
    return lane >= 0 ? { kind: 'lane', lane } : null;
  }
  return null;
}

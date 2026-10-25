/**
 * Input on a pult: on-screen pads, computer keys, MIDI or microphone [ID: GAME-MELODIQ-NOTES-PULT-INPUT]
 *
 * Every hit sounds on this device at once (the stage stays silent for a pult) and goes to the
 * stage via `play`. Same key layout and sources as the stage (`keyAction`, `useStageInput`).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { drumLaneOf, STRING_TUNINGS } from '../../../modules/music-score';
import { useMidiInput } from '../useMidiInput';
import { useMicPitch } from '../hooks/useMicPitch';
import { BrowserStageSound } from '../stage/engine/browserSound';
import { STAGE_INSTRUMENTS } from '../stage/logic/instruments';
import { keyAction } from '../stage/logic/keyboardInput';
import type { StageInputSource } from '../stage/useStageInput';
import type { PultInput, PultPart } from './logic/protocol';

/** The sung pitch is sent at most this often. */
const VOICE_EVERY_MS = 80;
const NO_STRINGS: number[] = [];

export function usePultInput(part: PultPart | null, play: (input: PultInput) => void) {
  const [source, setSource] = useState<StageInputSource>('keys');
  const midi = useMidiInput();
  const mic = useMicPitch();
  const sound = useRef<BrowserStageSound | null>(null);
  const inst = part ? STAGE_INSTRUMENTS[part.inst] : null;
  const tuning = part ? (STRING_TUNINGS[part.inst]?.tuning ?? NO_STRINGS) : NO_STRINGS;

  useEffect(() => {
    const s = new BrowserStageSound();
    sound.current = s;
    return () => {
      sound.current = null;
      s.close();
    };
  }, []);

  const hitLane = useCallback(
    (lane: number) => {
      const s = sound.current;
      if (!inst || !s) return;
      s.resume();
      if (inst.view === 'drums') s.playDrum(lane, 1);
      else if (inst.view === 'keys') s.playNote(inst.kind, lane, 0.5, 1);
      else if (inst.view === 'strings' && tuning[lane] !== undefined)
        s.playNote(inst.kind, tuning[lane], 0.5, 1);
      play({ kind: 'lane', lane });
    },
    [inst, tuning, play],
  );

  const hitPitch = useCallback(
    (pitch: number) => {
      const s = sound.current;
      if (!inst || !s) return;
      if (inst.view === 'drums') s.playDrum(drumLaneOf(pitch), 1);
      else if (inst.view !== 'pitch') s.playNote(inst.kind, pitch, 0.5, 1);
      play({ kind: 'pitch', pitch });
    },
    [inst, play],
  );

  // computer keys: always on, like on the stage
  useEffect(() => {
    if (!inst || !part) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.repeat || ev.target instanceof HTMLInputElement) return;
      const a = keyAction(ev.code, inst.view, part.octaveBase, tuning.length, true);
      if (a?.kind !== 'lane') return;
      ev.preventDefault();
      hitLane(a.lane);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inst, part, tuning.length, hitLane]);

  const held = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (source !== 'midi') return;
    const now = new Set(midi.pressedPitches);
    for (const p of now) if (!held.current.has(p)) hitPitch(p);
    held.current = now;
  }, [source, midi.pressedPitches, hitPitch]);

  const lastMic = useRef<{ pitch: number | null; at: number }>({ pitch: null, at: 0 });
  useEffect(() => {
    if (source !== 'mic' || !inst) return;
    const pitch = mic.micPitch;
    const last = lastMic.current;
    if (inst.view === 'pitch') {
      const now = performance.now();
      if (
        pitch === last.pitch ||
        (pitch !== null && last.pitch !== null && now - last.at < VOICE_EVERY_MS)
      )
        return;
      lastMic.current = { pitch, at: now };
      play({ kind: 'voice', pitch });
    } else {
      if (pitch !== null && pitch !== last.pitch) hitPitch(pitch);
      lastMic.current = { pitch, at: 0 };
    }
  }, [source, inst, mic.micPitch, hitPitch, play]);

  const choose = (next: StageInputSource) => {
    sound.current?.resume();
    if ((next === 'mic') !== mic.isMicActive) void mic.toggleMicrophone();
    setSource(next);
  };

  return { source, choose, midiDevices: midi.devices, hitLane };
}

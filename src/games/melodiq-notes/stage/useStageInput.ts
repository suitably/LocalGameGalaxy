import { useEffect, useRef, useState } from 'react';
import { useMidiInput } from '../useMidiInput';
import { useMicPitch } from '../hooks/useMicPitch';
import type { StageEngine } from './engine/StageEngine';

export type StageInputSource = 'keys' | 'midi' | 'mic';

/** Routes a MIDI device or the microphone to the highlighted player (the computer keyboard always works). */
export function useStageInput(engine: StageEngine) {
  const [source, setSource] = useState<StageInputSource>('keys');
  const midi = useMidiInput();
  const mic = useMicPitch();
  const held = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (source !== 'midi') return;
    const now = new Set(midi.pressedPitches);
    for (const p of now) if (!held.current.has(p)) engine.hitPitch(p);
    held.current = now;
  }, [engine, source, midi.pressedPitches]);

  const lastMic = useRef<number | null>(null);
  useEffect(() => {
    if (source !== 'mic') return;
    const pitch = mic.micPitch;
    const focus = engine.focus;
    if (focus?.instrument.view === 'pitch')
      engine.setVoice(pitch ?? focus.voice.pitch, pitch !== null);
    else if (pitch !== null && pitch !== lastMic.current) engine.hitPitch(pitch);
    lastMic.current = pitch;
  }, [engine, source, mic.micPitch]);

  const choose = (next: StageInputSource) => {
    if ((next === 'mic') !== mic.isMicActive) void mic.toggleMicrophone();
    setSource(next);
  };

  return { source, choose, midiDevices: midi.devices, micActive: mic.isMicActive };
}

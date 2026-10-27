import { useCallback, useEffect, useRef, useState } from 'react';
import { useMidiInput } from '../useMidiInput';
import { lostMidiInstrument, midiInstrument } from '../logic/midiPorts';
import { useMicPitch } from '../hooks/useMicPitch';
import type { StageEngine } from './engine/StageEngine';
import { GM_DRUM_CHANNEL } from './engine/players';

export type StageInputSource = 'keys' | 'midi' | 'mic';

/**
 * Routes a MIDI device or the microphone to the highlighted player (the computer keyboard always
 * works). Until the player picks an input, MIDI is used whenever a real instrument is connected.
 */
export function useStageInput(engine: StageEngine) {
  // null: automatic (MIDI with an instrument, else the computer keys)
  const [chosen, setChosen] = useState<StageInputSource | null>(null);
  const sourceRef = useRef<StageInputSource>(chosen ?? 'keys');
  // Hits go straight to the engine, without a render per note.
  const [midiLost, setMidiLost] = useState<string | null>(null);
  const midiLostRef = useRef<string | null>(null);
  const onNoteOn = useCallback(
    (pitch: number, _velocity: number, channel: number) => {
      // a note proves the instrument works again; render only for that first note
      if (midiLostRef.current) {
        midiLostRef.current = null;
        setMidiLost(null);
      }
      if (sourceRef.current !== 'midi') return;
      // an e-drum kit (GM percussion channel) shows the focused player the drum view
      if (channel === GM_DRUM_CHANNEL) engine.autoDrumView();
      engine.hitPitch(pitch);
    },
    [engine],
  );
  // automatic mode keeps looking, so an instrument plugged in later is picked up in Firefox too
  const midi = useMidiInput({ onNoteOn, rescan: chosen === null || chosen === 'midi' });
  const instrument = midiInstrument(midi.devices, midi.selectedDeviceId);
  const source: StageInputSource = chosen ?? (instrument ? 'midi' : 'keys');
  const instrumentName = instrument?.name ?? null;
  const lastInstrument = useRef<string | null>(instrumentName);
  useEffect(() => {
    const next = lostMidiInstrument(midiLostRef.current, lastInstrument.current, instrumentName);
    lastInstrument.current = instrumentName;
    if (next === midiLostRef.current) return;
    midiLostRef.current = next;
    setMidiLost(next);
  }, [instrumentName]);
  useEffect(() => {
    sourceRef.current = source;
  }, [source]);
  const mic = useMicPitch();

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
    setChosen(next);
  };

  return {
    source,
    choose,
    midiDevices: midi.devices,
    midiName: instrumentName,
    /** A real instrument that went away and has sent nothing since (hint: restart the browser). */
    midiLost,
    micActive: mic.isMicActive,
  };
}

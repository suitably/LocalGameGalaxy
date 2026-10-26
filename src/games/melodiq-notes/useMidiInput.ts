import { useState, useEffect, useCallback, useRef } from 'react';
import { pickMidiInput } from './logic/midiPorts';

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer?: string;
  state: string;
}

export interface ActiveMidiNote {
  pitch: number;
  velocity: number;
  timestamp: number;
}

/**
 * `onNoteOn` fires for every hit as it arrives; drum modules send note-off a few ms after
 * note-on, so a hit can come and go between two renders and never show up in `pressedPitches`.
 */
export const useMidiInput = (onNoteOn?: (pitch: number, velocity: number) => void) => {
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const selectedDeviceIdRef = useRef<string | null>(null);
  const [activeNotes, setActiveNotes] = useState<Map<number, ActiveMidiNote>>(new Map());
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const onNoteOnRef = useRef(onNoteOn);

  useEffect(() => {
    onNoteOnRef.current = onNoteOn;
  }, [onNoteOn]);

  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    if (!event.data || event.data.length < 3) return;

    const [status, noteNumber, velocity] = event.data;
    const command = status & 0xf0;

    // Note On command: 0x90, Note Off command: 0x80
    if (command === 0x90 && velocity > 0) {
      onNoteOnRef.current?.(noteNumber, velocity);
      setActiveNotes((prev) => {
        const next = new Map(prev);
        next.set(noteNumber, {
          pitch: noteNumber,
          velocity,
          timestamp: performance.now(),
        });
        return next;
      });
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      setActiveNotes((prev) => {
        const next = new Map(prev);
        next.delete(noteNumber);
        return next;
      });
    }
  }, []);

  /** Listens only on the selected input; re-run after hot-plug, since new ports start unbound. */
  const bindInputs = useCallback(
    (access: MIDIAccess, deviceId: string | null) => {
      access.inputs.forEach((input) => {
        input.onmidimessage = !deviceId || input.id === deviceId ? handleMidiMessage : null;
      });
    },
    [handleMidiMessage],
  );

  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setIsSupported(false);
      return;
    }

    let isMounted = true;

    navigator
      .requestMIDIAccess()
      .then((access) => {
        if (!isMounted) return;
        midiAccessRef.current = access;

        const updateDevices = () => {
          const inputs: MidiDevice[] = [];
          access.inputs.forEach((input) => {
            inputs.push({
              id: input.id,
              name: input.name || 'Unnamed MIDI Device',
              manufacturer: input.manufacturer ?? undefined,
              state: input.state,
            });
          });
          setDevices(inputs);

          // Prefer a real instrument over the OS loopback port ("Midi Through")
          const next = pickMidiInput(inputs, selectedDeviceIdRef.current);
          selectedDeviceIdRef.current = next;
          setSelectedDeviceId(next);
          bindInputs(access, next);
        };

        updateDevices();
        access.onstatechange = () => updateDevices();
      })
      .catch((err) => {
        console.warn('[useMidiInput] Web MIDI Access rejected/failed:', err);
        if (isMounted) setIsSupported(false);
      });

    return () => {
      isMounted = false;
      if (midiAccessRef.current) {
        midiAccessRef.current.onstatechange = null;
        midiAccessRef.current.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
      }
    };
  }, [bindInputs]);

  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
    if (midiAccessRef.current) bindInputs(midiAccessRef.current, selectedDeviceId);
  }, [selectedDeviceId, bindInputs]);

  return {
    isSupported,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    activeNotes,
    /** Array of currently pressed MIDI pitches (numbers) */
    pressedPitches: Array.from(activeNotes.keys()),
  };
};

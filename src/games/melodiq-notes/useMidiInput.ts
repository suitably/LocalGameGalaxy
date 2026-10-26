import { useState, useEffect, useCallback, useRef } from 'react';
import { isVirtualMidiPort, pickMidiInput } from './logic/midiPorts';

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer?: string;
  state: string;
}

/** Firefox reports instruments plugged in later only to a new `requestMIDIAccess()`. */
const RESCAN_MS = 2000;

interface MidiInputOptions {
  /**
   * Fires for every hit as it arrives. Hits are not kept in React state: a re-render per
   * note-on and note-off made busy passages stutter, and drum modules send note-off a few ms
   * after note-on, so a hit could come and go between two renders.
   */
  onNoteOn?: (pitch: number, velocity: number) => void;
  /** Asks for the devices again while no real instrument is connected (see RESCAN_MS). */
  rescan?: boolean;
}

export const useMidiInput = ({ onNoteOn, rescan = false }: MidiInputOptions = {}) => {
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const selectedDeviceIdRef = useRef<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const hasInstrumentRef = useRef(false);
  const onNoteOnRef = useRef(onNoteOn);

  useEffect(() => {
    onNoteOnRef.current = onNoteOn;
  }, [onNoteOn]);

  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    if (!event.data || event.data.length < 3) return;

    const [status, noteNumber, velocity] = event.data;
    const command = status & 0xf0;

    // Note On command: 0x90 (velocity 0 means Note Off)
    if (command === 0x90 && velocity > 0) onNoteOnRef.current?.(noteNumber, velocity);
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

  /** Switches to `access` (a rescan returns a new one) and drops the handlers of the old one. */
  const attach = useCallback(
    (access: MIDIAccess) => {
      const old = midiAccessRef.current;
      if (old && old !== access) {
        old.onstatechange = null;
        old.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
      }
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
        const picked = inputs.find((i) => i.id === next);
        hasInstrumentRef.current = !!picked && !isVirtualMidiPort(picked.name);
        selectedDeviceIdRef.current = next;
        setSelectedDeviceId(next);
        bindInputs(access, next);
      };

      updateDevices();
      access.onstatechange = () => updateDevices();
    },
    [bindInputs],
  );

  const isMountedRef = useRef(true);
  /** Asks for the devices again (Firefox lists an instrument plugged in later only then). */
  const rescanDevices = useCallback(() => {
    navigator
      .requestMIDIAccess?.()
      .then((access) => {
        if (isMountedRef.current) attach(access);
      })
      .catch(() => undefined);
  }, [attach]);

  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setIsSupported(false);
      return;
    }

    isMountedRef.current = true;

    navigator
      .requestMIDIAccess()
      .then((access) => {
        if (isMountedRef.current) attach(access);
      })
      .catch((err) => {
        console.warn('[useMidiInput] Web MIDI Access rejected/failed:', err);
        if (isMountedRef.current) setIsSupported(false);
      });

    const timer = rescan
      ? setInterval(() => {
          if (!hasInstrumentRef.current && midiAccessRef.current) rescanDevices();
        }, RESCAN_MS)
      : undefined;

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
      if (midiAccessRef.current) {
        midiAccessRef.current.onstatechange = null;
        midiAccessRef.current.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
      }
    };
  }, [attach, rescanDevices, rescan]);

  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
    if (midiAccessRef.current) bindInputs(midiAccessRef.current, selectedDeviceId);
  }, [selectedDeviceId, bindInputs]);

  return {
    isSupported,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
  };
};

import { useState, useEffect, useCallback, useRef } from 'react';

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

export const useMidiInput = () => {
    const [devices, setDevices] = useState<MidiDevice[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const selectedDeviceIdRef = useRef<string | null>(null);
    const [activeNotes, setActiveNotes] = useState<Map<number, ActiveMidiNote>>(new Map());
    const [isSupported, setIsSupported] = useState<boolean>(true);
    const midiAccessRef = useRef<MIDIAccess | null>(null);

    useEffect(() => {
        selectedDeviceIdRef.current = selectedDeviceId;
    }, [selectedDeviceId]);

    const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
        if (!event.data || event.data.length < 3) return;

        const [status, noteNumber, velocity] = event.data;
        const command = status & 0xf0;

        // Note On command: 0x90, Note Off command: 0x80
        if (command === 0x90 && velocity > 0) {
            setActiveNotes(prev => {
                const next = new Map(prev);
                next.set(noteNumber, {
                    pitch: noteNumber,
                    velocity,
                    timestamp: performance.now()
                });
                return next;
            });
        } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
            setActiveNotes(prev => {
                const next = new Map(prev);
                next.delete(noteNumber);
                return next;
            });
        }
    }, []);

    useEffect(() => {
        if (!navigator.requestMIDIAccess) {
            setIsSupported(false);
            return;
        }

        let isMounted = true;

        navigator.requestMIDIAccess()
            .then(access => {
                if (!isMounted) return;
                midiAccessRef.current = access;

                const updateDevices = () => {
                    const inputs: MidiDevice[] = [];
                    access.inputs.forEach(input => {
                        inputs.push({
                            id: input.id,
                            name: input.name || 'Unnamed MIDI Device',
                            manufacturer: input.manufacturer ?? undefined,
                            state: input.state
                        });
                    });
                    setDevices(inputs);

                    // Auto-select first device if none selected
                    if (inputs.length > 0 && !selectedDeviceIdRef.current) {
                        setSelectedDeviceId(inputs[0].id);
                    }
                };

                updateDevices();
                access.onstatechange = () => updateDevices();
            })
            .catch(err => {
                console.warn('[useMidiInput] Web MIDI Access rejected/failed:', err);
                if (isMounted) setIsSupported(false);
            });

        return () => {
            isMounted = false;
            if (midiAccessRef.current) {
                midiAccessRef.current.inputs.forEach(input => {
                    input.onmidimessage = null;
                });
            }
        };
    }, []);

    useEffect(() => {
        if (!midiAccessRef.current) return;

        midiAccessRef.current.inputs.forEach(input => {
            if (!selectedDeviceId || input.id === selectedDeviceId) {
                input.onmidimessage = handleMidiMessage;
            } else {
                input.onmidimessage = null;
            }
        });
    }, [selectedDeviceId, handleMidiMessage]);

    return {
        isSupported,
        devices,
        selectedDeviceId,
        setSelectedDeviceId,
        activeNotes,
        /** Array of currently pressed MIDI pitches (numbers) */
        pressedPitches: Array.from(activeNotes.keys())
    };
};

import { useRef, useCallback, useEffect } from 'react';

declare global {
    interface Window {
        webkitAudioContext?: typeof AudioContext;
    }
}

/** Converts MIDI note number to Hz frequency */
const midiToFreq = (midi: number): number => {
    return 440 * Math.pow(2, (midi - 69) / 12);
};

export const useAudioSynth = () => {
    const audioCtxRef = useRef<AudioContext | null>(null);

    const initAudioContext = useCallback(() => {
        if (!audioCtxRef.current) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                audioCtxRef.current = new AudioCtx();
            }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    /** Plays a synthesized piano-like tone for a given MIDI note pitch */
    const playNote = useCallback((midiPitch: number, durationSeconds: number = 0.5, velocity: number = 0.8) => {
        initAudioContext();
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        const freq = midiToFreq(midiPitch);
        const now = ctx.currentTime;

        // Create oscillator (Fundamental)
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, now); // 2nd harmonic

        // Envelope (Attack, Decay, Sustain, Release)
        // Accurately sustain the tone for the full durationSeconds
        const volume = Math.min(1, Math.max(0, velocity));
        const dur = Math.max(0.08, durationSeconds);
        const attackTime = Math.min(0.015, dur * 0.15);
        const releaseTime = Math.min(0.08, dur * 0.25);
        const sustainEndTime = Math.max(attackTime + 0.01, dur - releaseTime);

        gain.gain.setValueAtTime(0.0001, now);
        // Fast attack up to peak volume
        gain.gain.linearRampToValueAtTime(0.4 * volume, now + attackTime);
        // Sustain: gentle decay during note duration down to 65% of peak
        gain.gain.exponentialRampToValueAtTime(0.26 * volume, now + sustainEndTime);
        // Release: fade out at note end
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc2.start(now);

        const stopTime = now + dur + 0.05;
        osc.stop(stopTime);
        osc2.stop(stopTime);

        // Disconnect nodes after stop to prevent leak
        const handleEnded = () => {
            try {
                osc.disconnect();
                osc2.disconnect();
                gain.disconnect();
            } catch {
                // Ignore if already disconnected
            }
        };
        osc.addEventListener('ended', handleEnded, { once: true });
    }, [initAudioContext]);

    useEffect(() => {
        return () => {
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, []);

    return {
        playNote,
        initAudioContext
    };
};

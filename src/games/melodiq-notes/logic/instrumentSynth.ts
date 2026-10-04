import type { InstrumentCategory } from '../types';

/** Converts MIDI note number to Hz frequency */
export const midiToFreq = (midi: number): number => {
    return 440 * Math.pow(2, (midi - 69) / 12);
};

export interface ActiveVoice {
    stop: () => void;
}

/**
 * Plays a synthesized instrument voice using WebAudio nodes tailored to each instrument category.
 */
export function playSynthesizedNote(
    ctx: AudioContext,
    category: InstrumentCategory,
    midiPitch: number,
    durationSeconds: number = 0.5,
    volume: number = 0.8
): ActiveVoice {
    const now = ctx.currentTime;
    const freq = midiToFreq(midiPitch);
    const dur = Math.max(0.08, durationSeconds);
    const gainNode = ctx.createGain();
    const safeVolume = Math.min(1, Math.max(0, volume));

    const oscillators: OscillatorNode[] = [];
    const cleanups: (() => void)[] = [];

    if (category === 'drums') {
        // Synthesize drum hits based on pitch range
        if (midiPitch <= 38) {
            // Kick drum: rapid pitch dive sine
            const osc = ctx.createOscillator();
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);
            gainNode.gain.setValueAtTime(0.7 * safeVolume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
            osc.connect(gainNode);
            osc.start(now);
            osc.stop(now + 0.26);
            oscillators.push(osc);
        } else if (midiPitch <= 44) {
            // Snare: noise burst + snap tone
            const osc = ctx.createOscillator();
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
            gainNode.gain.setValueAtTime(0.5 * safeVolume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
            osc.connect(gainNode);
            osc.start(now);
            osc.stop(now + 0.21);
            oscillators.push(osc);
        } else {
            // Hi-hat / Cymbal: high-pitched noise transient
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(8000, now);
            gainNode.gain.setValueAtTime(0.3 * safeVolume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
            osc.connect(gainNode);
            osc.start(now);
            osc.stop(now + 0.09);
            oscillators.push(osc);
        }
    } else if (category === 'flute') {
        // Flute: Sine + soft octave harmonic + subtle vibrato
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 2, now);

        const attack = Math.min(0.06, dur * 0.2);
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.4 * safeVolume, now + attack);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(gainNode);
        osc2.connect(gainNode);
        osc.start(now);
        osc2.start(now);
        osc.stop(now + dur + 0.05);
        osc2.stop(now + dur + 0.05);
        oscillators.push(osc, osc2);
    } else if (category === 'bass') {
        // Bass: Deep sub-sine + punchy filtered saw
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + dur);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.5 * safeVolume, now + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        osc.start(now);
        osc2.start(now);
        osc.stop(now + dur + 0.05);
        osc2.stop(now + dur + 0.05);
        oscillators.push(osc, osc2);
    } else if (category === 'guitar') {
        // Guitar: Plucked string model with fast transient and decaying harmonics
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * 2, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + dur * 0.8);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.45 * safeVolume, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        osc.start(now);
        osc2.start(now);
        osc.stop(now + dur + 0.05);
        osc2.stop(now + dur + 0.05);
        oscillators.push(osc, osc2);
    } else if (category === 'strings') {
        // Strings: Detuned dual sawtooth with smooth attack
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * 1.003, now); // slight chorus detune

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, now);

        const attack = Math.min(0.08, dur * 0.25);
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.35 * safeVolume, now + attack);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + dur + 0.05);
        osc2.stop(now + dur + 0.05);
        oscillators.push(osc1, osc2);
    } else {
        // Piano: Harmonic triangle + sine with natural decay
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, now);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.4 * safeVolume, now + 0.012);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(gainNode);
        osc2.connect(gainNode);
        osc.start(now);
        osc2.start(now);
        osc.stop(now + dur + 0.05);
        osc2.stop(now + dur + 0.05);
        oscillators.push(osc, osc2);
    }

    gainNode.connect(ctx.destination);

    return {
        stop: () => {
            const stopNow = ctx.currentTime;
            try {
                gainNode.gain.cancelScheduledValues(stopNow);
                gainNode.gain.setValueAtTime(gainNode.gain.value, stopNow);
                gainNode.gain.linearRampToValueAtTime(0.0001, stopNow + 0.03);
                oscillators.forEach(o => {
                    try { o.stop(stopNow + 0.04); } catch { /* ignore */ }
                });
                cleanups.forEach(c => c());
            } catch { /* ignore */ }
        }
    };
}

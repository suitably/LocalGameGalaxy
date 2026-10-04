import { useRef, useCallback, useEffect } from 'react';
import type { InstrumentCategory } from './types';
import { SoundfontPlayer } from './logic/soundfontPlayer';
import { getStoredSoundConfig, resolveSoundfontName, type InstrumentSoundConfig } from './logic/soundSettings';

declare global {
    interface Window {
        webkitAudioContext?: typeof AudioContext;
    }
}

export interface PlayInstrumentNoteOptions {
    midiPitch: number;
    durationSeconds?: number;
    velocity?: number;
    partId?: string;
    midiProgram?: number;
    category?: InstrumentCategory;
    volume?: number;
}

export const useAudioSynth = () => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const soundfontPlayerRef = useRef<SoundfontPlayer | null>(null);
    const activeStoppersRef = useRef<Set<() => void>>(new Set());
    const soundConfigRef = useRef<InstrumentSoundConfig>(getStoredSoundConfig());

    const initAudioContext = useCallback(() => {
        if (!audioCtxRef.current) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                audioCtxRef.current = new AudioCtx();
                soundfontPlayerRef.current = new SoundfontPlayer(audioCtxRef.current);
            }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    const reloadSoundConfig = useCallback(() => {
        soundConfigRef.current = getStoredSoundConfig();
    }, []);

    /**
     * Plays a note for a specific instrument with its configured soundfont or synthesizer model
     */
    const playInstrumentNote = useCallback(({
        midiPitch,
        durationSeconds = 0.5,
        velocity = 0.8,
        partId,
        midiProgram,
        category = 'piano',
        volume = 1.0,
    }: PlayInstrumentNoteOptions) => {
        initAudioContext();
        const ctx = audioCtxRef.current;
        const player = soundfontPlayerRef.current;
        if (!ctx || !player) return;

        const config = soundConfigRef.current;
        const partVolume = (partId && config.volumes[partId] !== undefined)
            ? config.volumes[partId]
            : 1.0;
        const finalVolume = Math.max(0, Math.min(1, velocity * volume * partVolume));
        if (finalVolume <= 0.001) return;

        const instrumentSlug = (partId && config.customPresets[partId])
            ? config.customPresets[partId]
            : resolveSoundfontName(midiProgram, category);

        const customUrl = (partId && config.customUrls[partId]) || config.customBaseUrl;

        const voice = player.play(
            config.provider,
            instrumentSlug,
            category,
            midiPitch,
            durationSeconds,
            finalVolume,
            customUrl
        );

        activeStoppersRef.current.add(voice.stop);
        setTimeout(() => {
            activeStoppersRef.current.delete(voice.stop);
        }, (durationSeconds + 0.1) * 1000);
    }, [initAudioContext]);

    /** Fallback simple note playback */
    const playNote = useCallback((midiPitch: number, durationSeconds: number = 0.5, velocity: number = 0.8) => {
        playInstrumentNote({
            midiPitch,
            durationSeconds,
            velocity,
            category: 'piano',
            midiProgram: 1,
        });
    }, [playInstrumentNote]);

    const stopAllNotes = useCallback(() => {
        activeStoppersRef.current.forEach(stop => {
            try { stop(); } catch { /* ignore */ }
        });
        activeStoppersRef.current.clear();
    }, []);

    useEffect(() => {
        return () => {
            stopAllNotes();
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, [stopAllNotes]);

    return {
        playNote,
        playInstrumentNote,
        stopAllNotes,
        initAudioContext,
        reloadSoundConfig,
    };
};

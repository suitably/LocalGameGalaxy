import { useEffect, useRef, useState, useCallback } from 'react';
import type { StemType } from '../types';

interface StemPlayerProps {
    stems?: Partial<Record<StemType, string>>;
    speedPercent: number;
    syncOffsetMs?: number;
    isPlaying: boolean;
}

export const useStemAudioPlayer = ({ stems, speedPercent, syncOffsetMs = 0, isPlaying }: StemPlayerProps) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodesRef = useRef<Map<StemType, AudioBufferSourceNode>>(new Map());
    const gainNodesRef = useRef<Map<StemType, GainNode>>(new Map());
    const buffersRef = useRef<Map<StemType, AudioBuffer>>(new Map());

    const [isLoaded, setIsLoaded] = useState(false);
    const [mutedStems, setMutedStems] = useState<Set<StemType>>(new Set());
    const startTimeRef = useRef<number>(0);
    const pauseTimeRef = useRef<number>(0);

    const initAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };

    const loadStems = async (stemsUrls: Partial<Record<StemType, string>>) => {
        setIsLoaded(false);
        stop();
        buffersRef.current.clear();

        if (!stemsUrls || Object.keys(stemsUrls).length === 0) {
            setIsLoaded(true);
            return;
        }

        initAudioContext();
        const ctx = audioContextRef.current!;

        const loadPromises = Object.entries(stemsUrls).map(async ([type, url]) => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                buffersRef.current.set(type as StemType, audioBuffer);
            } catch (err) {
                console.error(`[StemAudioPlayer] Failed to load stem ${type}:`, err);
            }
        });

        await Promise.all(loadPromises);
        setIsLoaded(true);
    };

    useEffect(() => {
        loadStems(stems || {});
        return () => stop();
    }, [stems]);

    const play = useCallback(() => {
        if (!isLoaded || buffersRef.current.size === 0) return;
        initAudioContext();
        const ctx = audioContextRef.current!;

        // Disconnect existing
        sourceNodesRef.current.forEach(source => {
            source.stop();
            source.disconnect();
        });
        sourceNodesRef.current.clear();
        gainNodesRef.current.clear();

        const offsetSec = syncOffsetMs / 1000;

        buffersRef.current.forEach((buffer, type) => {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = speedPercent / 100;

            const gainNode = ctx.createGain();
            gainNode.gain.value = mutedStems.has(type) ? 0 : 1;

            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            sourceNodesRef.current.set(type, source);
            gainNodesRef.current.set(type, gainNode);

            // start handles offset if needed
            source.start(0, pauseTimeRef.current + Math.max(0, offsetSec));
        });

        startTimeRef.current = ctx.currentTime - pauseTimeRef.current;
    }, [isLoaded, speedPercent, mutedStems, syncOffsetMs]);

    const pause = useCallback(() => {
        if (!audioContextRef.current) return;
        pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
        sourceNodesRef.current.forEach(source => {
            source.stop();
            source.disconnect();
        });
        sourceNodesRef.current.clear();
    }, []);

    const stop = useCallback(() => {
        sourceNodesRef.current.forEach(source => {
            source.stop();
            source.disconnect();
        });
        sourceNodesRef.current.clear();
        pauseTimeRef.current = 0;
        startTimeRef.current = 0;
    }, []);

    useEffect(() => {
        if (isPlaying) {
            play();
        } else {
            pause();
        }
    }, [isPlaying, play, pause]);

    // Update playback rate dynamically
    useEffect(() => {
        sourceNodesRef.current.forEach(source => {
            source.playbackRate.value = speedPercent / 100;
        });
    }, [speedPercent]);

    const toggleMute = useCallback((type: StemType) => {
        setMutedStems(prev => {
            const next = new Set(prev);
            if (next.has(type)) {
                next.delete(type);
                if (gainNodesRef.current.has(type)) {
                    gainNodesRef.current.get(type)!.gain.value = 1;
                }
            } else {
                next.add(type);
                if (gainNodesRef.current.has(type)) {
                    gainNodesRef.current.get(type)!.gain.value = 0;
                }
            }
            return next;
        });
    }, []);

    const getCurrentTime = useCallback(() => {
        if (!audioContextRef.current) return 0;
        if (isPlaying) {
             return audioContextRef.current.currentTime - startTimeRef.current;
        }
        return pauseTimeRef.current;
    }, [isPlaying]);

    return {
        isLoaded,
        mutedStems,
        toggleMute,
        getCurrentTime,
        stop
    };
};

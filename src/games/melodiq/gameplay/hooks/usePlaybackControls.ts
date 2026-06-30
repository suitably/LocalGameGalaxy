import { useCallback, useRef, type MutableRefObject } from 'react';

interface UsePlaybackControlsProps {
    audioRef: React.RefObject<HTMLAudioElement>;
    vocalsRef: React.RefObject<HTMLAudioElement>;
    videoRef: React.RefObject<HTMLVideoElement>;
    isPlaying: boolean;
    setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    isFinished: boolean;
    isPausedForScore: boolean;
    setIsPausedForScore: React.Dispatch<React.SetStateAction<boolean>>;
    muteAudio: boolean;
    songVolume: number;
    masterVolume: number;
}

export function usePlaybackControls({
    audioRef,
    vocalsRef,
    videoRef,
    isPlaying,
    setIsPlaying,
    isFinished,
    isPausedForScore,
    setIsPausedForScore,
    muteAudio,
    songVolume,
    masterVolume
}: UsePlaybackControlsProps) {
    const playPromiseRef = useRef<Promise<void> | null>(null);

    const pauseForScore = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            if (vocalsRef.current) vocalsRef.current.pause();
            if (videoRef.current) videoRef.current.pause();
        }
        setIsPlaying(false);
        if (!isFinished) setIsPausedForScore(true);
    }, [isFinished, setIsPlaying, setIsPausedForScore, audioRef, vocalsRef, videoRef]);

    const safePlay = useCallback(async () => {
        if (!audioRef.current) return;
        try {
            playPromiseRef.current = audioRef.current.play();
            if (vocalsRef.current) vocalsRef.current.play().catch(e => console.warn("Vocals play failed", e));
            await playPromiseRef.current;
            if (videoRef.current) {
                videoRef.current.play().catch(e => console.warn("Video play failed", e));
            }
            setIsPlaying(true);
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('[Session] Playback aborted (likely fast skip)');
            } else {
                console.error('[Session] Playback failed', error);
            }
            setIsPlaying(false);
        } finally {
            playPromiseRef.current = null;
        }
    }, [audioRef, vocalsRef, videoRef, setIsPlaying]);

    const resumeFromScore = useCallback(() => {
        setIsPausedForScore(false);
        if (audioRef.current && !isFinished) {
            safePlay();
        }
    }, [isFinished, safePlay, setIsPausedForScore, audioRef]);

    const togglePlay = useCallback(() => {
        if (isPausedForScore) {
            resumeFromScore();
            return;
        }

        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                if (vocalsRef.current) vocalsRef.current.pause();
                if (videoRef.current) videoRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.volume = muteAudio ? 0 : songVolume * masterVolume;
                safePlay();
            }
        }
    }, [isPlaying, songVolume, masterVolume, muteAudio, isPausedForScore, resumeFromScore, safePlay, audioRef, vocalsRef, videoRef, setIsPlaying]);

    const handleNext = useCallback((): boolean => {
        if (!isFinished && !isPausedForScore) {
            pauseForScore();
            return true;
        }
        return false;
    }, [isFinished, isPausedForScore, pauseForScore]);

    return {
        togglePlay,
        pauseForScore,
        resumeFromScore,
        handleNext,
        safePlay,
        playPromiseRef
    };
}

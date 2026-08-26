import { useCallback, useRef } from 'react';

interface UsePlaybackControlsProps {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    vocalsRef: React.RefObject<HTMLAudioElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isPlaying: boolean;
    setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    isFinished: boolean;
    isPausedForScore: boolean;
    setIsPausedForScore: React.Dispatch<React.SetStateAction<boolean>>;
    muteAudio: boolean;
    songVolume: number;
    masterVolume: number;
    vocalsVolume: number;
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
    masterVolume,
    vocalsVolume
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
        // Synchronize stems before playing to prevent desync
        const currentPos = audioRef.current.currentTime;
        if (vocalsRef.current && Math.abs(vocalsRef.current.currentTime - currentPos) > 0.05) {
            vocalsRef.current.currentTime = currentPos;
        }
        if (videoRef.current && Math.abs(videoRef.current.currentTime - currentPos) > 0.1) {
            videoRef.current.currentTime = currentPos;
        }

        // Apply volume settings before every play() call to ensure they are correct
        // even on the very first autostart (when the volume useEffect may have run
        // before audioRef was attached to the DOM element).
        audioRef.current.volume = muteAudio ? 0 : songVolume * masterVolume;
        if (vocalsRef.current) {
            vocalsRef.current.volume = muteAudio ? 0 : vocalsVolume * masterVolume;
        }
        try {
            playPromiseRef.current = audioRef.current.play();
            if (vocalsRef.current) vocalsRef.current.play().catch(e => console.warn("Vocals play failed", e));
            if (videoRef.current) videoRef.current.play().catch(e => console.warn("Video play failed", e));
            await playPromiseRef.current;
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
    }, [audioRef, vocalsRef, videoRef, setIsPlaying, muteAudio, songVolume, masterVolume, vocalsVolume]);

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

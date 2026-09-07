import { useCallback, useRef, useEffect } from 'react';

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
    const paramsRef = useRef({ songVolume, masterVolume, vocalsVolume, muteAudio });
    useEffect(() => {
        paramsRef.current = { songVolume, masterVolume, vocalsVolume, muteAudio };
    }, [songVolume, masterVolume, vocalsVolume, muteAudio]);

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
        const currentPos = audioRef.current.currentTime;
        const { songVolume: sVol, masterVolume: mVol, vocalsVolume: vVol, muteAudio: isMuted } = paramsRef.current;
        const targetVocalsTime = Math.max(0, currentPos);

        // Synchronize stems unconditionally before playing to guarantee zero initial desync.
        // If vocal stem currentTime is not aligned, seek and await seeked before calling play().
        if (vocalsRef.current) {
            if (Math.abs(vocalsRef.current.currentTime - targetVocalsTime) > 0.001) {
                await new Promise<void>((resolve) => {
                    const vocal = vocalsRef.current;
                    if (!vocal) return resolve();
                    let timeoutId: any = null;
                    const onSeeked = () => {
                        clearTimeout(timeoutId);
                        vocal.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    timeoutId = setTimeout(() => {
                        vocal.removeEventListener('seeked', onSeeked);
                        resolve();
                    }, 200);
                    vocal.addEventListener('seeked', onSeeked, { once: true });
                    vocal.currentTime = targetVocalsTime;
                });
            }
        }

        if (videoRef.current && Math.abs(videoRef.current.currentTime - currentPos) > 0.05) {
            videoRef.current.currentTime = currentPos;
        }

        // Apply volume settings before every play() call
        audioRef.current.volume = isMuted ? 0 : sVol * mVol;
        if (vocalsRef.current) {
            vocalsRef.current.volume = isMuted ? 0 : vVol * mVol;
        }

        try {
            const playPromises: Promise<any>[] = [audioRef.current.play()];
            if (vocalsRef.current) {
                playPromises.push(vocalsRef.current.play().catch(e => console.warn("Vocals play failed", e)));
            }
            if (videoRef.current) {
                playPromises.push(videoRef.current.play().catch(e => console.warn("Video play failed", e)));
            }
            playPromiseRef.current = Promise.all(playPromises).then(() => {});
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

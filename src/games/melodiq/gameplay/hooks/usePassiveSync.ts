import { useEffect } from 'react';
import { PlayerRuntime } from './PlayerRuntime';
import { type PassiveGameState } from '../MelodiqSession';
import { type ScoreDisplayHandle } from '../ScoreDisplay';

interface UsePassiveSyncProps {
    isPassive: boolean;
    passiveState: PassiveGameState | null;
    isClient: boolean;
    players: PlayerRuntime[];
    setPlayers: React.Dispatch<React.SetStateAction<PlayerRuntime[]>>;
    playersRef: React.RefObject<PlayerRuntime[]>;
    scoreDisplayRef: React.RefObject<ScoreDisplayHandle | null>;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isPlayingRef: React.RefObject<boolean>;
    setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    setIsFinished: React.Dispatch<React.SetStateAction<boolean>>;
    setIsPausedForScore: React.Dispatch<React.SetStateAction<boolean>>;
    setPassivePlayBlocked: React.Dispatch<React.SetStateAction<boolean>>;
    virtualTimeRef: React.RefObject<number>;
}

export function usePassiveSync({
    isPassive,
    passiveState,
    isClient,

    setPlayers,
    playersRef,
    scoreDisplayRef,
    audioRef,
    videoRef,
    isPlayingRef,
    setIsPlaying,
    setIsFinished,
    setIsPausedForScore,
    setPassivePlayBlocked,
    virtualTimeRef
}: UsePassiveSyncProps) {

    useEffect(() => {
        if (!isPassive) return;

        const handleGameState = (passiveState: PassiveGameState) => {
            if (!passiveState) return;

            const remotePlayers = passiveState.players || [];

            if (playersRef.current && playersRef.current.length !== remotePlayers.length) {
                const newPlayers = remotePlayers.map(p => new PlayerRuntime({
                    id: p.id,
                    name: p.name,
                    hue: p.hue,
                    isRemote: true
                }));
                setPlayers(newPlayers);
                if (playersRef.current !== undefined) {
                    (playersRef as any).current = newPlayers;
                }
            }

            remotePlayers.forEach((pState, idx) => {
                const rt = playersRef.current?.[idx];
                if (rt) {
                    rt.pitchRef.current = pState.currentPitch;
                    rt.activeSegments = pState.activeSegments;
                    rt.trackScores = pState.trackScores;
                    rt.score = pState.score;
                    rt.combo = pState.combo;

                    if (pState.lastHit && (!rt.lastHit || pState.lastHit.timestamp > rt.lastHit.timestamp)) {
                        rt.lastHit = pState.lastHit;
                        scoreDisplayRef.current?.triggerHit(
                            pState.id,
                            pState.lastHit.rating,
                            pState.combo,
                            pState.lastHit.score
                        );
                    }
                }
            });

            if (passiveState.isPlaying !== isPlayingRef.current) {
                // Immediately update ref to prevent duplicate trigger loops
                if (isPlayingRef.current !== undefined) {
                    (isPlayingRef as any).current = passiveState.isPlaying;
                }
                
                if (passiveState.isPlaying) {
                    if (audioRef.current && Math.abs(audioRef.current.currentTime - passiveState.currentTime) > 1.0) {
                        audioRef.current.currentTime = passiveState.currentTime;
                        if (videoRef.current) videoRef.current.currentTime = passiveState.currentTime;
                    }
                    const tryPlay = async () => {
                        setIsPlaying(true);
                        try {
                            if (audioRef.current) await audioRef.current.play();
                            if (videoRef.current) videoRef.current.play().catch(() => { });
                            setPassivePlayBlocked(false);
                        } catch (e: any) {
                            console.warn('[Session] Passive play blocked by autoplay policy:', e.name);
                        }
                    };
                    tryPlay();
                } else {
                    audioRef.current?.pause();
                    videoRef.current?.pause();
                    setIsPlaying(false);
                }
            }

            setIsFinished(prev => passiveState.isFinished !== prev ? passiveState.isFinished : prev);
            setIsPausedForScore(prev => passiveState.isPausedForScore !== prev ? passiveState.isPausedForScore : prev);

            if (audioRef.current && passiveState.isPlaying && isPlayingRef.current && !audioRef.current.paused && Math.abs(audioRef.current.currentTime - passiveState.currentTime) > 1.0) {
                console.log(`[Session] Syncing time drift: Local=${audioRef.current.currentTime.toFixed(2)} Remote=${passiveState.currentTime.toFixed(2)}`);
                audioRef.current.currentTime = passiveState.currentTime;
                if (videoRef.current) videoRef.current.currentTime = passiveState.currentTime;
            }

            if (isClient) {
                // Ignore hostTimestamp because Date.now() on different devices is not synchronized (clock drift)
                // Assume a fixed ~20ms latency for LAN WebRTC
                const latency = 0.02;
                const estimatedHostTime = passiveState.currentTime + latency;
                
                const drift = Math.abs(virtualTimeRef.current! - estimatedHostTime);
                if (!isPlayingRef.current || drift > 0.15) {
                    (virtualTimeRef as any).current = estimatedHostTime;
                }
            }
        };

        if (passiveState) {
            handleGameState(passiveState);
        }

        const onEvent = (e: any) => handleGameState(e.detail);
        window.addEventListener('melodiq_tv_game_state', onEvent);
        return () => window.removeEventListener('melodiq_tv_game_state', onEvent);
    }, [isPassive, isClient]);

    // Sync local pitch directly from PhoneClientEngine (bypassing network latency for the local cursor)
    useEffect(() => {
        if (!isClient) return;

        let myName = 'Phone';
        const storedProfile = localStorage.getItem('melodiq_client_profile');
        if (storedProfile) {
            try {
                const parsed = JSON.parse(storedProfile);
                if (parsed.name) myName = parsed.name;
            } catch (err) { }
        }

        const handleLocalPitch = (e: any) => {
            const { pitch } = e.detail;
            playersRef.current?.forEach(rt => {
                if (rt.config.name === myName) {
                    rt.pitchRef.current = pitch;
                }
            });
        };

        window.addEventListener('melodiq_local_pitch', handleLocalPitch);
        return () => window.removeEventListener('melodiq_local_pitch', handleLocalPitch);
    }, [isClient, playersRef]);
}

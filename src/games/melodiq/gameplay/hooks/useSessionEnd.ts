import { useCallback } from 'react';
import db from '../../db';
import { PlayerRuntime } from './PlayerRuntime';
import { type Song } from '../../db';

interface UseSessionEndProps {
    playersRef: React.RefObject<PlayerRuntime[]>;
    song: Song;
    setResults: React.Dispatch<React.SetStateAction<any[]>>;
    setIsFinished: React.Dispatch<React.SetStateAction<boolean>>;
    setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useSessionEnd({
    playersRef,
    song,
    setResults,
    setIsFinished,
    setIsPlaying,
    videoRef
}: UseSessionEndProps) {
    const handleSongEnd = useCallback(async () => {
        console.log('Song ended, showing scoreboard');

        const now = new Date();
        const currentResults: any[] = [];
        const isoDate = now.toISOString();

        if (!playersRef.current) return;

        for (const p of playersRef.current) {
            const totalScore = Math.round(Object.values(p.trackScores).reduce((a, b) => a + b, 0));
            p.score = totalScore;

            if (p.config.isRemote) {
                if (p.webRtcManager && p.remotePeerId) {
                    const statsPayload = {
                        type: 'stats',
                        songTitle: song.title,
                        score: totalScore,
                        date: isoDate
                    };
                    console.log(`[Session] Sending stats to ${p.config.name}`, statsPayload);
                    p.webRtcManager.sendToPeer(p.remotePeerId, statsPayload);
                }

                currentResults.push({
                    config: p.config,
                    score: totalScore,
                    history: [],
                    isNewRecord: false,
                    isRemote: true,
                    loadingHistory: true
                });
            } else {
                try {
                    await db.scores.add({
                        songId: song.id,
                        profileId: p.config.id,
                        score: totalScore,
                        date: isoDate
                    });

                    const allScores = await db.scores
                        .where({ songId: song.id, profileId: p.config.id })
                        .toArray();

                    const sorted = allScores.sort((a, b) => b.score - a.score);
                    const isRecord = sorted.length > 0 && sorted[0].date === isoDate;

                    currentResults.push({
                        config: p.config,
                        score: totalScore,
                        history: sorted,
                        isNewRecord: isRecord,
                        isRemote: false,
                        loadingHistory: false
                    });

                } catch (e) {
                    console.error("Failed to save score", e);
                    currentResults.push({
                        config: p.config,
                        score: totalScore,
                        history: [],
                        isNewRecord: false,
                        isRemote: false
                    });
                }
            }
        }

        setResults(currentResults);
        setIsFinished(true);
        setIsPlaying(false);
        if (videoRef.current) videoRef.current.pause();
    }, [song.title, song.id, playersRef, setResults, setIsFinished, setIsPlaying, videoRef]);

    return { handleSongEnd };
}

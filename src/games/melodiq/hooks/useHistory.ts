import { useState, useEffect, useCallback } from 'react';
import db, { type SongMeta } from '../db';
import { type UserProfile } from '../types';

export interface HistorySession {
    id: string; // generated id like `${date}-${songId}`
    date: string;
    songId: string;
    song?: SongMeta;
    players: {
        profileId: string;
        score: number;
        profile?: UserProfile;
    }[];
}

export function useHistory(songs: SongMeta[], profiles: UserProfile[]) {
    const [history, setHistory] = useState<HistorySession[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const allScores = await db.scores.toArray();
            
            // Group by date and songId
            const grouped = new Map<string, HistorySession>();
            
            for (const score of allScores) {
                const key = `${score.date}-${score.songId}`;
                
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        id: key,
                        date: score.date,
                        songId: score.songId,
                        song: songs.find(s => s.id === score.songId),
                        players: []
                    });
                }
                
                const session = grouped.get(key)!;
                session.players.push({
                    profileId: score.profileId,
                    score: score.score,
                    profile: profiles.find(p => p.id === score.profileId)
                });
            }
            
            // Convert to array and sort by date descending
            const sortedHistory = Array.from(grouped.values()).sort((a, b) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
            
            // Sort players in each session by score descending
            sortedHistory.forEach(session => {
                session.players.sort((a, b) => b.score - a.score);
            });
            
            setHistory(sortedHistory);
        } catch (e) {
            console.error("Failed to load history:", e);
        } finally {
            setIsLoading(false);
        }
    }, [songs, profiles]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    return { history, isLoading, refreshHistory: loadHistory };
}

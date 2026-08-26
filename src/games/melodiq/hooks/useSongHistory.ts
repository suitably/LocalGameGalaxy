import { useState, useCallback } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';

export interface HistorySongItem {
    id: string;
    title: string;
    artist: string;
    year?: number;
    playedAt: number;
}

const MAX_HISTORY_ITEMS = 50;

/**
 * `useSongHistory` — Phone & Client Song History Hook
 *
 * Persists songs requested or sung on this device to localStorage.
 * Enables quick re-queueing and favorite lookup across sessions.
 */
export function useSongHistory() {
    const [history, setHistory] = useState<HistorySongItem[]>(() => {
        return storage.getJson<HistorySongItem[]>(STORAGE_KEYS.SONG_HISTORY, []);
    });

    const addSongToHistory = useCallback((song: { id: string; title: string; artist: string; year?: number }) => {
        setHistory(prev => {
            const filtered = prev.filter(item => item.id !== song.id);
            const updated: HistorySongItem[] = [
                {
                    id: song.id,
                    title: song.title,
                    artist: song.artist,
                    year: song.year,
                    playedAt: Date.now()
                },
                ...filtered
            ].slice(0, MAX_HISTORY_ITEMS);

            storage.setJson(STORAGE_KEYS.SONG_HISTORY, updated);
            return updated;
        });
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        storage.setJson(STORAGE_KEYS.SONG_HISTORY, []);
    }, []);

    return {
        history,
        addSongToHistory,
        clearHistory
    };
}

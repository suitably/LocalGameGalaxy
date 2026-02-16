import { useState, useEffect, useCallback } from 'react';
import type { SongMeta } from '../db';

const QUEUE_STORAGE_KEY = 'melodiq_queue';
const CHANNEL_NAME = 'melodiq_queue_channel';

export interface QueueItem {
    id: string;
    song: SongMeta;
    addedAt: number;
    requester?: string;
}

export const useQueue = () => {
    const [queue, setQueue] = useState<QueueItem[]>(() => {
        const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    });

    const [nowPlaying, setNowPlayingState] = useState<SongMeta | null>(() => {
        const stored = localStorage.getItem('melodiq_now_playing');
        return stored ? JSON.parse(stored) : null;
    });

    // Broadcast channel for cross-tab sync
    const [channel] = useState(() => new BroadcastChannel(CHANNEL_NAME));

    const syncQueue = useCallback((newQueue: QueueItem[]) => {
        setQueue(newQueue);
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
    }, []);

    const syncNowPlaying = useCallback((song: SongMeta | null) => {
        setNowPlayingState(song);
        if (song) {
            localStorage.setItem('melodiq_now_playing', JSON.stringify(song));
        } else {
            localStorage.removeItem('melodiq_now_playing');
        }
    }, []);

    // Listen for updates from other tabs
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'UPDATE_QUEUE') {
                setQueue(event.data.payload);
            } else if (event.data.type === 'UPDATE_NOW_PLAYING') {
                setNowPlayingState(event.data.payload);
            }
        };

        channel.addEventListener('message', handleMessage);
        return () => channel.removeEventListener('message', handleMessage);
    }, [channel]);

    const setNowPlaying = useCallback((song: SongMeta | null) => {
        syncNowPlaying(song);
        channel.postMessage({ type: 'UPDATE_NOW_PLAYING', payload: song });
    }, [channel, syncNowPlaying]);

    const addToQueue = useCallback((song: SongMeta, requester?: string) => {
        const newItem: QueueItem = {
            id: crypto.randomUUID(),
            song,
            addedAt: Date.now(),
            requester
        };

        // Prevent exact duplicates if user clicks twice fast
        if (queue.length > 0 && queue[queue.length - 1].song.id === song.id) {
            return;
        }

        const next = [...queue, newItem];
        syncQueue(next);
        channel.postMessage({ type: 'UPDATE_QUEUE', payload: next });
    }, [queue, channel, syncQueue]);

    const removeFromQueue = useCallback((itemId: string) => {
        const next = queue.filter(item => item.id !== itemId);
        syncQueue(next);
        channel.postMessage({ type: 'UPDATE_QUEUE', payload: next });
    }, [queue, channel, syncQueue]);

    const popNext = useCallback((): QueueItem | null => {
        if (queue.length === 0) return null;

        const nextItem = queue[0];
        const next = queue.slice(1);

        syncQueue(next);
        channel.postMessage({ type: 'UPDATE_QUEUE', payload: next });

        return nextItem;
    }, [queue, channel, syncQueue]);

    const clearQueue = useCallback(() => {
        const next: QueueItem[] = [];
        syncQueue(next);
        channel.postMessage({ type: 'UPDATE_QUEUE', payload: next });
    }, [channel, syncQueue]);

    const addNext = useCallback((song: SongMeta, requester?: string) => {
        const newItem: QueueItem = {
            id: crypto.randomUUID(),
            song,
            addedAt: Date.now(),
            requester
        };

        // Prevent exact duplicate at the top
        if (queue.length > 0 && queue[0].song.id === song.id) {
            return;
        }

        const next = [newItem, ...queue];
        syncQueue(next);
        channel.postMessage({ type: 'UPDATE_QUEUE', payload: next }); // Use same type or new one? UPDATE_QUEUE covers whole list.
    }, [queue, channel, syncQueue]);

    const moveItem = useCallback((fromIndex: number, toIndex: number) => {
        if (fromIndex < 0 || fromIndex >= queue.length || toIndex < 0 || toIndex >= queue.length) return;

        const next = [...queue];
        const [movedItem] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, movedItem);

        syncQueue(next);
        channel.postMessage({ type: 'UPDATE_QUEUE', payload: next });
    }, [queue, channel, syncQueue]);

    return {
        queue,
        nowPlaying,
        addToQueue,
        addNext,
        removeFromQueue,
        popNext,
        clearQueue,
        moveItem,
        setNowPlaying
    };
};

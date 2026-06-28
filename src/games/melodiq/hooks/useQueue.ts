import { useState, useEffect, useCallback } from 'react';
import type { SongMeta } from '../db';



const QUEUE_STORAGE_KEY = 'melodiq_queue';
const CHANNEL_NAME = 'melodiq_queue_channel';

const isClient = new URLSearchParams(window.location.search).get('role') === 'client';

export interface QueueItem {
    id: string;
    song: SongMeta;
    addedAt: number;
    requester?: string;
}

export const useQueue = () => {
    const [queue, setQueue] = useState<QueueItem[]>(() => {
        if (isClient) return [];
        const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    });

    const [nowPlaying, setNowPlayingState] = useState<SongMeta | null>(() => {
        if (isClient) return null;
        const stored = localStorage.getItem('melodiq_now_playing');
        return stored ? JSON.parse(stored) : null;
    });

    // Broadcast channel for cross-tab sync
    const [channel] = useState(() => new BroadcastChannel(CHANNEL_NAME));

    const syncQueue = useCallback((newQueue: QueueItem[]) => {
        setQueue(newQueue);
        if (!isClient) {
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
        }
    }, []);

    const syncNowPlaying = useCallback((song: SongMeta | null) => {
        setNowPlayingState(song);
        if (!isClient) {
            if (song) {
                localStorage.setItem('melodiq_now_playing', JSON.stringify(song));
            } else {
                localStorage.removeItem('melodiq_now_playing');
            }
        }
    }, []);

    // Listen for updates from other tabs (Host logic)
    useEffect(() => {
        if (isClient) return;
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

    // Listen for updates from PhoneClientEngine (Client logic)
    useEffect(() => {
        if (!isClient) return;
        const handleClientUpdate = (e: any) => {
            const data = e.detail;
            if (data.queue) setQueue(data.queue);
            if (data.nowPlaying !== undefined) setNowPlayingState(data.nowPlaying);
        };
        window.addEventListener('melodiq_client_queue_update', handleClientUpdate);
        return () => window.removeEventListener('melodiq_client_queue_update', handleClientUpdate);
    }, []);

    const setNowPlaying = useCallback((song: SongMeta | null) => {
        if (isClient) return; // Client cannot set now playing
        syncNowPlaying(song);
        channel.postMessage({ type: 'UPDATE_NOW_PLAYING', payload: song });
    }, [channel, syncNowPlaying]);

    const addToQueue = useCallback((song: SongMeta, requester?: string) => {
        if (isClient) {
            window.dispatchEvent(new CustomEvent('melodiq_client_send_data', { detail: { type: 'queue.add', songId: song.id } }));
            return;
        }

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
        if (isClient) {
            window.dispatchEvent(new CustomEvent('melodiq_client_send_data', { detail: { type: 'queue.remove', itemId } }));
            return;
        }

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
        if (isClient) return; // Client shouldn't clear entire queue usually
        const next: QueueItem[] = [];
        syncQueue(next);
        channel.postMessage({ type: 'UPDATE_QUEUE', payload: next });
    }, [channel, syncQueue]);

    const playPlaylistNow = useCallback((songs: SongMeta[], requester?: string) => {
        const next: QueueItem[] = songs.map(song => ({
            id: crypto.randomUUID(),
            song,
            addedAt: Date.now(),
            requester
        }));
        syncQueue(next);
        channel.postMessage({ type: 'UPDATE_QUEUE', payload: next });
        
        // Dispatch an event to play the first song immediately
        if (next.length > 0) {
            const event = new CustomEvent('melodiq_play_playlist_trigger', { detail: next[0].song });
            window.dispatchEvent(event);
        }
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
        setNowPlaying,
        playPlaylistNow
    };
};

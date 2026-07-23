import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import React from 'react';
import type { SongMeta } from '../db';



const QUEUE_STORAGE_KEY = 'melodiq_queue';
const CHANNEL_NAME = 'melodiq_queue_channel';

const isClient = new URLSearchParams(window.location.search).get('role') === 'client';

export interface QueueItem {
    id: string;
    song: SongMeta;
    addedAt: number;
    requester?: string;
    requesterId?: string;
    participants?: any[]; // using any[] to avoid circular dependency or needing ActivePlayer import if not available here
}

interface QueueContextValue {
    queue: QueueItem[];
    nowPlaying: SongMeta | null;
    addToQueue: (song: SongMeta, requester?: string, requesterId?: string) => void;
    addNext: (song: SongMeta, requester?: string, requesterId?: string) => void;
    removeFromQueue: (itemId: string) => void;
    popNext: () => QueueItem | null;
    clearQueue: () => void;
    moveItem: (fromIndex: number, toIndex: number) => void;
    replaceItem: (itemId: string, newSong: SongMeta) => void;
    toggleQueueParticipant: (itemId: string, deviceId: string, profile: any) => void;
    reorderQueueParticipant: (itemId: string, startIndex: number, endIndex: number) => void;
    setNowPlaying: (song: SongMeta | null) => void;
    playPlaylistNow: (songs: SongMeta[], requester?: string) => void;
}

const QueueContext = createContext<QueueContextValue | null>(null);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

    // Ref for stable callbacks that need current queue value without re-creating
    const queueRef = useRef(queue);
    useEffect(() => { queueRef.current = queue; }, [queue]);

    // Broadcast channel for cross-tab sync — managed in a single useEffect for proper cleanup
    const channelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        if (isClient) return;

        const channel = new BroadcastChannel(CHANNEL_NAME);
        channelRef.current = channel;

        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'UPDATE_QUEUE') {
                setQueue(event.data.payload);
            } else if (event.data.type === 'UPDATE_NOW_PLAYING') {
                setNowPlayingState(event.data.payload);
            }
        };

        channel.addEventListener('message', handleMessage);

        return () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
            channelRef.current = null;
        };
    }, []);

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

    const broadcastQueue = useCallback((newQueue: QueueItem[]) => {
        channelRef.current?.postMessage({ type: 'UPDATE_QUEUE', payload: newQueue });
    }, []);

    const broadcastNowPlaying = useCallback((song: SongMeta | null) => {
        channelRef.current?.postMessage({ type: 'UPDATE_NOW_PLAYING', payload: song });
    }, []);

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

    const setNowPlaying = useCallback((song: SongMeta | null) => {
        if (isClient) return; // Client cannot set now playing
        syncNowPlaying(song);
        broadcastNowPlaying(song);
    }, [syncNowPlaying, broadcastNowPlaying]);

    const addToQueue = useCallback((song: SongMeta, requester?: string, requesterId?: string) => {
        if (isClient) {
            window.dispatchEvent(new CustomEvent('melodiq_client_send_data', { detail: { type: 'queue.add', songId: song.id } }));
            return;
        }

        const activeSession = JSON.parse(localStorage.getItem('melodiq_active_session') || '[]');
        const storedProfiles = JSON.parse(localStorage.getItem('melodiq_profiles') || '[]');
        
        const enrichedSession = activeSession.map((p: any) => {
            if (p.profileId === 'BOT') return { ...p, name: 'Bot Player', hue: 330, isRemote: false };
            const profile = storedProfiles.find((prof: any) => prof.id === p.profileId);
            return profile ? { ...p, name: profile.name, hue: profile.hue, isRemote: false } : p;
        });
        
        const newItem: QueueItem = {
            id: crypto.randomUUID(),
            song,
            addedAt: Date.now(),
            requester,
            requesterId,
            participants: enrichedSession
        };

        // The strict duplicate check was removed to allow users to queue the same song back-to-back.
        // If accidental double clicks become an issue, we should implement a time-based debounce instead.

        setQueue(prev => {
            const next = [...prev, newItem];
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(next));
            broadcastQueue(next);
            return next;
        });
    }, [broadcastQueue]);

    const removeFromQueue = useCallback((itemId: string) => {
        if (isClient) {
            window.dispatchEvent(new CustomEvent('melodiq_client_send_data', { detail: { type: 'queue.remove', itemId } }));
            return;
        }

        setQueue(prev => {
            const next = prev.filter(item => item.id !== itemId);
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(next));
            broadcastQueue(next);
            return next;
        });
    }, [broadcastQueue]);

    const popNext = useCallback((): QueueItem | null => {
        // Use ref to avoid stale closure; we need the *current* queue at call time
        const current = queueRef.current;
        if (current.length === 0) return null;

        const nextItem = current[0];
        const next = current.slice(1);

        syncQueue(next);
        broadcastQueue(next);

        return nextItem;
    }, [syncQueue, broadcastQueue]);

    const clearQueue = useCallback(() => {
        if (isClient) return; // Client shouldn't clear entire queue usually
        const next: QueueItem[] = [];
        syncQueue(next);
        broadcastQueue(next);
    }, [syncQueue, broadcastQueue]);

    const playPlaylistNow = useCallback((songs: SongMeta[], requester?: string) => {
        const activeSession = JSON.parse(localStorage.getItem('melodiq_active_session') || '[]');
        const storedProfiles = JSON.parse(localStorage.getItem('melodiq_profiles') || '[]');
        
        const enrichedSession = activeSession.map((p: any) => {
            if (p.profileId === 'BOT') return { ...p, name: 'Bot Player', hue: 330, isRemote: false };
            const profile = storedProfiles.find((prof: any) => prof.id === p.profileId);
            return profile ? { ...p, name: profile.name, hue: profile.hue, isRemote: false } : p;
        });

        const next: QueueItem[] = songs.map(song => ({
            id: crypto.randomUUID(),
            song,
            addedAt: Date.now(),
            requester,
            participants: enrichedSession
        }));
        syncQueue(next);
        broadcastQueue(next);
        
        // Dispatch an event to play the first song immediately
        if (next.length > 0) {
            const event = new CustomEvent('melodiq_play_playlist_trigger', { detail: next[0].song });
            window.dispatchEvent(event);
        }
    }, [syncQueue, broadcastQueue]);

    const addNext = useCallback((song: SongMeta, requester?: string, requesterId?: string) => {
        const activeSession = JSON.parse(localStorage.getItem('melodiq_active_session') || '[]');
        const storedProfiles = JSON.parse(localStorage.getItem('melodiq_profiles') || '[]');
        
        const enrichedSession = activeSession.map((p: any) => {
            if (p.profileId === 'BOT') return { ...p, name: 'Bot Player', hue: 330, isRemote: false };
            const profile = storedProfiles.find((prof: any) => prof.id === p.profileId);
            return profile ? { ...p, name: profile.name, hue: profile.hue, isRemote: false } : p;
        });

        const newItem: QueueItem = {
            id: crypto.randomUUID(),
            song,
            addedAt: Date.now(),
            requester,
            requesterId,
            participants: enrichedSession
        };

        // The strict duplicate check was removed to allow users to queue the same song back-to-back.
        // If accidental double clicks become an issue, we should implement a time-based debounce instead.

        setQueue(prev => {
            const next = [newItem, ...prev];
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(next));
            broadcastQueue(next);
            return next;
        });
    }, [broadcastQueue]);

    const replaceItem = useCallback((itemId: string, newSong: SongMeta) => {
        if (isClient) return;
        setQueue(prev => {
            const next = prev.map(item => item.id === itemId ? { ...item, song: newSong } : item);
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(next));
            broadcastQueue(next);
            return next;
        });
    }, [broadcastQueue]);

    const toggleQueueParticipant = useCallback((itemId: string, deviceId: string, profile: any) => {
        if (isClient) {
            window.dispatchEvent(new CustomEvent('melodiq_client_send_data', { detail: { type: 'queue.toggle_participant', itemId, deviceId, profile } }));
            return;
        }

        setQueue(prev => {
            const next = prev.map(item => {
                if (item.id === itemId) {
                    const participants = item.participants || [];
                    const exists = participants.find((p: any) => p.deviceId === deviceId || p.profileId === deviceId || (profile?.peerId && p.deviceId === profile.peerId));
                    let newParticipants;
                    if (exists) {
                        newParticipants = participants.filter((p: any) => p.deviceId !== deviceId && p.profileId !== deviceId && !(profile?.peerId && p.deviceId === profile.peerId));
                    } else {
                        newParticipants = [...participants, {
                            profileId: deviceId, // Phone guests use deviceId as profileId
                            deviceId: deviceId,
                            volume: 0.8,
                            muted: false,
                            latency: 0,
                            isRemote: profile?.isRemote || false,
                            name: profile?.name,
                            hue: profile?.hue
                        }];
                    }
                    if (!isClient) {
                        localStorage.setItem('melodiq_active_session', JSON.stringify(newParticipants));
                    }
                    return { ...item, participants: newParticipants };
                }
                return item;
            });
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(next));
            broadcastQueue(next);
            return next;
        });
    }, [broadcastQueue]);

    const reorderQueueParticipant = useCallback((itemId: string, startIndex: number, endIndex: number) => {
        if (isClient) {
            window.dispatchEvent(new CustomEvent('melodiq_client_send_data', { 
                detail: { type: 'queue.reorder_participant', itemId, startIndex, endIndex } 
            }));
            return;
        }
        setQueue(prev => {
            const next = prev.map(item => {
                if (item.id === itemId) {
                    const participants = Array.from(item.participants || []);
                    const [removed] = participants.splice(startIndex, 1);
                    participants.splice(endIndex, 0, removed);
                    localStorage.setItem('melodiq_active_session', JSON.stringify(participants));
                    return { ...item, participants };
                }
                return item;
            });
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(next));
            broadcastQueue(next);
            return next;
        });
    }, [broadcastQueue]);

    const moveItem = useCallback((fromIndex: number, toIndex: number) => {
        setQueue(prev => {
            if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) return prev;

            const next = [...prev];
            const [movedItem] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, movedItem);

            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(next));
            broadcastQueue(next);
            return next;
        });
    }, [broadcastQueue]);

    const value: QueueContextValue = {
        queue,
        nowPlaying,
        addToQueue,
        addNext,
        removeFromQueue,
        popNext,
        clearQueue,
        moveItem,
        replaceItem,
        toggleQueueParticipant,
        reorderQueueParticipant,
        setNowPlaying,
        playPlaylistNow,
    };
    // eslint-disable-next-line react-compiler/react-compiler
    return React.createElement(QueueContext.Provider, { value }, children);
};

export const useQueue = (): QueueContextValue => {
    const ctx = useContext(QueueContext);
    if (!ctx) {
        throw new Error('useQueue must be used within a QueueProvider');
    }
    return ctx;
};

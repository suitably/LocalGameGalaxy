import React, { useEffect } from 'react';
import { useWebRTC } from '../audio/WebRTCContext';
import { useQueue } from '../hooks/useQueue';
import { useSongs } from '../hooks/useSongs';


export const PhoneQueueBridge: React.FC = () => {
    const { manager } = useWebRTC();
    const { queue, addToQueue, removeFromQueue, nowPlaying } = useQueue();
    const { songs } = useSongs();

    // Broadcast Queue Updates to all connected peers whenever queue changes
    useEffect(() => {
        if (!manager) return;

        const payload = {
            type: 'queue.update',
            queue: queue.map(item => ({
                id: item.id,
                title: item.song.title,
                artist: item.song.artist,
                requester: item.requester,
            })),
            nowPlaying: nowPlaying ? {
                title: nowPlaying.title,
                artist: nowPlaying.artist
            } : null
        };

        // Broadcast to all connected peers
        manager.broadcast(payload);
    }, [queue, nowPlaying, manager]);

    // Listen for commands
    useEffect(() => {
        if (!manager) return;

        const handleMessage = (peerId: string, data: any) => {
            if (!data || !data.type) return;

            switch (data.type) {
                case 'queue.get': {
                    console.log('[PhoneQueueBridge] Received queue.get from', peerId);
                    // Send current queue to specific peer
                    const payload = {
                        type: 'queue.update',
                        queue: queue.map(item => ({
                            id: item.id,
                            title: item.song.title,
                            artist: item.song.artist,
                            requester: item.requester,
                        })),
                        nowPlaying: nowPlaying ? {
                            title: nowPlaying.title,
                            artist: nowPlaying.artist
                        } : null
                    };
                    manager.sendToPeer(peerId, payload);
                    break;
                }

                case 'library.search': {
                    const query = (data.query || '').toLowerCase();
                    const filters = data.filters || {};
                    console.log(`[PhoneQueueBridge] Search: "${query}" Filters:`, filters, `Total Songs: ${songs.length}`);

                    let results = songs;

                    // Apply Filters
                    if (filters.genre && filters.genre !== 'All') {
                        results = results.filter(s => s.genre && s.genre.toLowerCase() === filters.genre.toLowerCase());
                    }
                    if (filters.year && filters.year !== 'All') {
                        // Decades logic: 2010s -> starts with 201, 1990s -> starts with 199
                        // If exact match fails, try decade matching
                        const filterYearStr = String(filters.year);
                        if (filterYearStr.endsWith('s')) {
                            const prefix = filterYearStr.substring(0, 3); // "2010s" -> "201"
                            results = results.filter(s => s.year && String(s.year).startsWith(prefix));
                        } else {
                            results = results.filter(s => s.year && String(s.year) === filterYearStr);
                        }
                    }
                    if (filters.language && filters.language !== 'All') {
                        results = results.filter(s => s.language && s.language.toLowerCase() === filters.language.toLowerCase());
                    }

                    // Apply Search Query
                    if (query) {
                        results = results.filter(s =>
                            s.title.toLowerCase().includes(query) ||
                            s.artist.toLowerCase().includes(query)
                        );
                    }

                    console.log(`[PhoneQueueBridge] Found ${results.length} matches`);

                    // Slice to avoid sending huge payload
                    const sliced = results.slice(0, 50).map(s => ({
                        id: s.id,
                        title: s.title,
                        artist: s.artist,
                        year: s.year,
                        genre: s.genre,
                        language: s.language
                    }));

                    manager.sendToPeer(peerId, {
                        type: 'library.results',
                        results: sliced,
                        query: data.query
                    });
                    break;
                }

                case 'queue.add': {
                    if (data.songId) {
                        const song = songs.find(s => s.id === data.songId);
                        if (song) {
                            // Find peer name for requester
                            const peer = manager.getConnectedPeers().find(p => p.peerId === peerId);
                            addToQueue(song, peer ? peer.name : 'Remote');
                        }
                    }
                    break;
                }

                case 'queue.remove': {
                    if (data.itemId) {
                        removeFromQueue(data.itemId);
                    }
                    break;
                }
            }
        };

        manager.on('message', handleMessage);

        return () => {
            manager.off('message', handleMessage);
        };
    }, [manager, songs, queue, addToQueue, removeFromQueue, nowPlaying]); // Dependencies need to be stable or this will re-bind constantly

    return null;
};

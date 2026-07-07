import React, { useEffect } from 'react';
import { useWebRTC } from '../audio/WebRTCContext';
import { useQueue } from '../hooks/useQueue';
import { useSongs } from '../hooks/useSongs';


export const PhoneQueueBridge: React.FC = () => {
    const { manager } = useWebRTC();
    const { queue, addToQueue, removeFromQueue, nowPlaying, toggleQueueParticipant, reorderQueueParticipant } = useQueue();
    const { songs } = useSongs();

    // Broadcast Queue Updates to all connected peers whenever queue changes
    useEffect(() => {
        if (!manager) return;

        const payload = {
            type: 'queue.update',
            queue,
            nowPlaying
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
                        queue,
                        nowPlaying
                    };
                    manager.sendToPeer(peerId, payload);

                    // Also send helper_config so the client knows the helper URL
                    // and can load songs via the WebRTC proxy.
                    // This is the trigger for the client's useSongs to start loading.
                    const helperUrl = localStorage.getItem('melodiq_helper_url');
                    const helperToken = localStorage.getItem('melodiq_helper_token');
                    if (helperUrl) {
                        manager.sendToPeer(peerId, {
                            type: 'helper_config',
                            url: helperUrl,
                            token: helperToken
                        });
                    }
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
                            const peer = manager.getConnectedPeers().find(p => p.peerId === peerId);
                            if (peer) {
                                const storedRoles = localStorage.getItem('melodiq_client_roles');
                                let role = 'singer';
                                if (storedRoles && peer.deviceId) {
                                    try { role = JSON.parse(storedRoles)[peer.deviceId] || 'singer'; } catch (e) {}
                                }
                                if (role !== 'singer') {
                                    addToQueue(song, peer.name, peer.deviceId);
                                } else {
                                    console.warn(`[PhoneQueueBridge] Denied queue.add from ${peer.name} (Role: ${role})`);
                                }
                            }
                        }
                    }
                    break;
                }

                case 'remote.select_song': {
                    if (data.songId) {
                        const peer = manager.getConnectedPeers().find(p => p.peerId === peerId);
                        if (peer) {
                            const storedRoles = localStorage.getItem('melodiq_client_roles');
                            let role = 'singer';
                            if (storedRoles && peer.deviceId) {
                                try { role = JSON.parse(storedRoles)[peer.deviceId] || 'singer'; } catch (e) {}
                            }
                            if (role !== 'singer') {
                                const canForcePlay = (role === 'admin' || role === 'queue_manager') && data.forcePlay;
                                window.dispatchEvent(new CustomEvent('melodiq_remote_select_song', { 
                                    detail: { 
                                        songId: data.songId, 
                                        forcePlay: canForcePlay,
                                        requester: peer.name,
                                        requesterId: peer.deviceId 
                                    } 
                                }));
                            } else {
                                console.warn(`[PhoneQueueBridge] Denied remote.select_song from ${peer.name} (Role: ${role})`);
                            }
                        }
                    }
                    break;
                }

                case 'queue.remove': {
                    if (data.itemId) {
                        const peer = manager.getConnectedPeers().find(p => p.peerId === peerId);
                        if (peer) {
                            const storedRoles = localStorage.getItem('melodiq_client_roles');
                            let role = 'singer';
                            if (storedRoles && peer.deviceId) {
                                try { role = JSON.parse(storedRoles)[peer.deviceId] || 'singer'; } catch (e) {}
                            }
                            
                            if (role === 'admin' || role === 'queue_manager') {
                                removeFromQueue(data.itemId);
                            } else if (role === 'queue_contributor') {
                                // Find the item to check who added it
                                const item = queue.find(i => i.id === data.itemId);
                                if (item && item.requesterId === peer.deviceId) {
                                    removeFromQueue(data.itemId);
                                } else {
                                    console.warn(`[PhoneQueueBridge] Denied queue.remove from ${peer.name} (Role: ${role}, Owner: ${item?.requesterId})`);
                                }
                            } else {
                                console.warn(`[PhoneQueueBridge] Denied queue.remove from ${peer.name} (Role: ${role})`);
                            }
                        }
                    }
                    break;
                }
                case 'queue.reorder_participant': {
                    if (data.itemId && typeof data.startIndex === 'number' && typeof data.endIndex === 'number') {
                        const peer = manager.getConnectedPeers().find(p => p.peerId === peerId);
                        if (peer) {
                            const storedRoles = localStorage.getItem('melodiq_client_roles');
                            let role = 'singer';
                            if (storedRoles && peer.deviceId) {
                                try { role = JSON.parse(storedRoles)[peer.deviceId] || 'singer'; } catch (e) {}
                            }

                            const isManager = role === 'admin' || role === 'queue_manager';
                            const isOwner = role === 'queue_contributor' && queue.find(i => i.id === data.itemId)?.requesterId === peer.deviceId;

                            if (isManager || isOwner) {
                                reorderQueueParticipant(data.itemId, data.startIndex, data.endIndex);
                            } else {
                                console.warn(`[PhoneQueueBridge] Denied queue.reorder_participant from ${peer.name} (Role: ${role})`);
                            }
                        }
                    }
                    break;
                }
                case 'queue.toggle_participant': {
                    if (data.itemId && data.deviceId) {
                        const peer = manager.getConnectedPeers().find(p => p.peerId === peerId);
                        if (peer) {
                            const storedRoles = localStorage.getItem('melodiq_client_roles');
                            let role = 'singer';
                            if (storedRoles && peer.deviceId) {
                                try { role = JSON.parse(storedRoles)[peer.deviceId] || 'singer'; } catch (e) {}
                            }

                            const isSelfToggle = data.deviceId === peer.deviceId || data.deviceId === peer.peerId;
                            const isManager = role === 'admin' || role === 'queue_manager';
                            const isOwner = role === 'queue_contributor' && queue.find(i => i.id === data.itemId)?.requesterId === peer.deviceId;

                            if (isSelfToggle || isManager || isOwner) {
                                const profile = data.profile || { name: peer.name, hue: peer.hue };
                                toggleQueueParticipant(data.itemId, data.deviceId, profile);
                            } else {
                                console.warn(`[PhoneQueueBridge] Denied queue.toggle_participant from ${peer.name} for ${data.deviceId} (Role: ${role})`);
                            }
                        }
                    }
                    break;
                }
            }
        };

        manager.on('message', handleMessage);

        return () => {
            manager.off('message', handleMessage);
        };
    }, [manager, songs, queue, addToQueue, removeFromQueue, nowPlaying, toggleQueueParticipant]); // Dependencies need to be stable or this will re-bind constantly

    return null;
};

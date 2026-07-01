import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { type Playlist } from '../db';

export const usePlaylists = () => {
    const [showGlobalPlaylists, setShowGlobalPlaylists] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncEnabled, setSyncEnabled] = useState(() => {
        return localStorage.getItem('melodiq_enable_playlist_sync') !== 'false';
    });

    // Read config from storage
    const getHelperConfig = () => ({
        url: localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000',
        token: localStorage.getItem('melodiq_helper_token') || '',
        enabled: localStorage.getItem('melodiq_enable_helper') !== 'false' && syncEnabled
    });

    // Local playlists from Dexie
    const localPlaylists = useLiveQuery(
        () => db.playlists.toArray(),
        []
    );

    const syncWithServer = useCallback(async () => {
        const { url, token, enabled } = getHelperConfig();
        if (!enabled || !url) return;
        
        setIsSyncing(true);
        try {
            const helperUrl = url.replace(/\/$/, "");
            
            // 1. Fetch from server
            const res = await fetch(`${helperUrl}/api/playlists`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            if (!res.ok) throw new Error('Failed to fetch playlists');
            const serverPlaylists: Playlist[] = await res.json();
            
            const localPlaylistsList = await db.playlists.toArray();
            
            // 2. Merge logic
            // To simplify, if server has it and it's newer, update local.
            // If local has it and it's newer, update server.
            for (const serverP of serverPlaylists) {
                const localP = localPlaylistsList.find(p => p.id === serverP.id);
                const isGlobal = serverP.creatorToken !== token;
                
                if (!localP) {
                    // New from server
                    await db.playlists.put({ ...serverP, isGlobal });
                } else if (serverP.updatedAt > localP.updatedAt) {
                    // Server is newer
                    await db.playlists.put({ ...serverP, isGlobal });
                } else if (localP.updatedAt > serverP.updatedAt && !localP.isGlobal) {
                    // Local is newer and we own it -> push to server
                    await pushToServer(localP);
                }
            }
            
            // 3. Push local playlists that server doesn't have (if we own them)
            for (const localP of localPlaylistsList) {
                if (!localP.isGlobal && !serverPlaylists.find(p => p.id === localP.id)) {
                    await pushToServer(localP);
                }
            }
            
        } catch (e) {
            console.error('Playlist sync failed:', e);
        } finally {
            setIsSyncing(false);
        }
    }, []);

    const pushToServer = async (playlist: Playlist) => {
        const { url, token, enabled } = getHelperConfig();
        if (!enabled || !url) return;
        
        const helperUrl = url.replace(/\/$/, "");
        try {
            await fetch(`${helperUrl}/api/playlists`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(playlist)
            });
        } catch (e) {
            console.error('Failed to push playlist to server:', e);
        }
    };

    const deleteFromServer = async (id: string) => {
        const { url, token, enabled } = getHelperConfig();
        if (!enabled || !url) return;
        
        const helperUrl = url.replace(/\/$/, "");
        try {
            await fetch(`${helperUrl}/api/playlists/${id}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
        } catch (e) {
            console.error('Failed to delete playlist from server:', e);
        }
    };

    // Initial sync
    useEffect(() => {
        syncWithServer();
    }, [syncWithServer]);

    const createPlaylist = async (name: string) => {
        const { token } = getHelperConfig();
        const newPlaylist: Playlist = {
            id: crypto.randomUUID(),
            name,
            songs: [],
            creatorToken: token,
            isGlobal: false,
            updatedAt: Date.now()
        };
        await db.playlists.put(newPlaylist);
        await pushToServer(newPlaylist);
    };

    const deletePlaylist = async (id: string) => {
        await db.playlists.delete(id);
        await deleteFromServer(id);
    };

    const updatePlaylistName = async (id: string, name: string) => {
        const p = await db.playlists.get(id);
        if (p) {
            p.name = name;
            p.updatedAt = Date.now();
            await db.playlists.put(p);
            await pushToServer(p);
        }
    };

    const addSongToPlaylist = async (playlistId: string, songId: string) => {
        const p = await db.playlists.get(playlistId);
        if (p && !p.songs.includes(songId)) {
            p.songs.push(songId);
            p.updatedAt = Date.now();
            await db.playlists.put(p);
            await pushToServer(p);
        }
    };

    const addSongsToPlaylist = async (playlistId: string, songIds: string[]) => {
        const p = await db.playlists.get(playlistId);
        if (p) {
            let changed = false;
            for (const id of songIds) {
                if (!p.songs.includes(id)) {
                    p.songs.push(id);
                    changed = true;
                }
            }
            if (changed) {
                p.updatedAt = Date.now();
                await db.playlists.put(p);
                await pushToServer(p);
            }
        }
    };

    const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
        const p = await db.playlists.get(playlistId);
        if (p) {
            p.songs = p.songs.filter(id => id !== songId);
            p.updatedAt = Date.now();
            await db.playlists.put(p);
            await pushToServer(p);
        }
    };

    const moveSongInPlaylist = async (playlistId: string, fromIndex: number, toIndex: number) => {
        const p = await db.playlists.get(playlistId);
        if (p) {
            const songs = [...p.songs];
            const [moved] = songs.splice(fromIndex, 1);
            songs.splice(toIndex, 0, moved);
            p.songs = songs;
            p.updatedAt = Date.now();
            await db.playlists.put(p);
            await pushToServer(p);
        }
    };

    // Filter displayed playlists
    const playlists = localPlaylists ? localPlaylists.filter(p => {
        if (showGlobalPlaylists) return p.isGlobal;
        return !p.isGlobal;
    }) : [];

    // Handle toggling sync
    const toggleSync = (enabled: boolean) => {
        setSyncEnabled(enabled);
        localStorage.setItem('melodiq_enable_playlist_sync', enabled ? 'true' : 'false');
        if (enabled) {
            syncWithServer(); // Immediately sync when turned on
        }
    };

    return {
        playlists,
        allPlaylists: localPlaylists || [],
        showGlobalPlaylists,
        setShowGlobalPlaylists,
        isSyncing,
        syncEnabled,
        toggleSync,
        syncWithServer,
        createPlaylist,
        deletePlaylist,
        updatePlaylistName,
        addSongToPlaylist,
        addSongsToPlaylist,
        removeSongFromPlaylist,
        moveSongInPlaylist
    };
};

import { useState, useCallback } from 'react';
import type { UserProfile, ActivePlayer } from '../types';
import { COLOR_PRESETS } from '../types';

interface ProfilesState {
    profiles: UserProfile[];
    activePlayers: ActivePlayer[];
}

const persistProfiles = (profiles: UserProfile[], activePlayers: ActivePlayer[]) => {
    localStorage.setItem('melodiq_profiles', JSON.stringify(profiles));
    localStorage.setItem('melodiq_active_session', JSON.stringify(activePlayers));
};

const loadInitialData = (): ProfilesState => {
    const storedProfiles = localStorage.getItem('melodiq_profiles');
    const storedActive = localStorage.getItem('melodiq_active_session');

    if (storedProfiles) {
        return {
            profiles: JSON.parse(storedProfiles),
            activePlayers: storedActive ? JSON.parse(storedActive) : []
        };
    }

    // Data Migration: Check for legacy P1/P2
    const p1Name = localStorage.getItem('melodiq_p1_name');
    const p2Name = localStorage.getItem('melodiq_p2_name');

    if (p1Name || p2Name) {
        const newProfiles: UserProfile[] = [];
        const newActive: ActivePlayer[] = [];

        // Migrate P1
        const p1Id = crypto.randomUUID();
        const p1Hue = parseInt(localStorage.getItem('melodiq_p1_hue') || '190');
        const p1Dev = localStorage.getItem('melodiq_p1_device') || '';
        newProfiles.push({ id: p1Id, name: p1Name || 'Player 1', hue: p1Hue });
        newActive.push({ profileId: p1Id, deviceId: p1Dev, volume: 0.8, muted: true, latency: 0 });

        // Migrate P2
        if (p2Name) {
            const p2Id = crypto.randomUUID();
            const p2Hue = parseInt(localStorage.getItem('melodiq_p2_hue') || '120');
            const p2Dev = localStorage.getItem('melodiq_p2_device') || '';
            newProfiles.push({ id: p2Id, name: p2Name || 'Player 2', hue: p2Hue });
            newActive.push({ profileId: p2Id, deviceId: p2Dev, volume: 0.8, muted: true, latency: 0 });
        }

        return { profiles: newProfiles, activePlayers: newActive };
    }

    // Fresh Start: Create Default Profile
    const defaultId = crypto.randomUUID();
    return {
        profiles: [{ id: defaultId, name: 'Player 1', hue: 190 }],
        activePlayers: [{ profileId: defaultId, deviceId: '', volume: 0.8, muted: true, latency: 0 }]
    };
};

export const useProfiles = (devices: MediaDeviceInfo[]) => {
    // Lazy load initial data
    const [initialData] = useState(loadInitialData);
    const [profiles, setProfiles] = useState<UserProfile[]>(initialData.profiles);
    const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>(initialData.activePlayers);

    // Profile Management (with instant persist)
    const addProfile = useCallback(() => {
        setProfiles(prev => {
            const newProfile: UserProfile = {
                id: crypto.randomUUID(),
                name: `Player ${prev.length + 1}`,
                hue: COLOR_PRESETS[prev.length % COLOR_PRESETS.length].hue
            };
            const next = [...prev, newProfile];
            persistProfiles(next, activePlayers);
            return next;
        });
    }, [activePlayers]);

    const updateProfile = useCallback((id: string, updates: Partial<UserProfile>) => {
        setProfiles(prev => {
            const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
            persistProfiles(next, activePlayers);
            return next;
        });
    }, [activePlayers]);

    const deleteProfile = useCallback((id: string) => {
        setProfiles(prevProfiles => {
            const nextProfiles = prevProfiles.filter(p => p.id !== id);
            setActivePlayers(prevActive => {
                const nextActive = prevActive.filter(ap => ap.profileId !== id);
                persistProfiles(nextProfiles, nextActive);
                return nextActive;
            });
            return nextProfiles;
        });
    }, []);

    // Session Selection (with instant persist)
    const toggleActivePlayer = useCallback((profileId: string) => {
        setActivePlayers(prev => {
            let next: ActivePlayer[];
            if (prev.some(ap => ap.profileId === profileId)) {
                next = prev.filter(ap => ap.profileId !== profileId);
            } else {
                const usedDevices = prev.map(ap => ap.deviceId).filter(Boolean);
                const nextDevice = devices.find(d => !usedDevices.includes(d.deviceId))?.deviceId || '';
                next = [...prev, { profileId, deviceId: nextDevice, volume: 0.8, muted: true, latency: 0 }];
            }
            persistProfiles(profiles, next);
            return next;
        });
    }, [devices, profiles]);

    const moveActivePlayer = useCallback((index: number, direction: 'up' | 'down') => {
        setActivePlayers(prev => {
            const newActive = [...prev];
            if (direction === 'up' && index > 0) {
                [newActive[index], newActive[index - 1]] = [newActive[index - 1], newActive[index]];
            } else if (direction === 'down' && index < newActive.length - 1) {
                [newActive[index], newActive[index + 1]] = [newActive[index + 1], newActive[index]];
            }
            persistProfiles(profiles, newActive);
            return newActive;
        });
    }, [profiles]);

    const updateActivePlayerConfig = useCallback((profileId: string, updates: Partial<ActivePlayer>) => {
        setActivePlayers(prev => {
            const next = prev.map(ap => ap.profileId === profileId ? { ...ap, ...updates } : ap);
            persistProfiles(profiles, next);
            return next;
        });
    }, [profiles]);

    /** Replace all state (for undo) */
    const resetProfiles = useCallback((newProfiles: UserProfile[], newActive: ActivePlayer[]) => {
        setProfiles(newProfiles);
        setActivePlayers(newActive);
        persistProfiles(newProfiles, newActive);
    }, []);

    // saveProfiles kept for compatibility but now optional
    const saveProfiles = useCallback(() => {
        persistProfiles(profiles, activePlayers);
    }, [profiles, activePlayers]);

    return {
        profiles,
        activePlayers,
        addProfile,
        updateProfile,
        deleteProfile,
        toggleActivePlayer,
        moveActivePlayer,
        updateActivePlayerConfig,
        resetProfiles,
        saveProfiles
    };
};

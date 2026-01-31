import { useState, useCallback } from 'react';
import type { UserProfile, ActivePlayer } from '../types';
import { COLOR_PRESETS } from '../types';

interface ProfilesState {
    profiles: UserProfile[];
    activePlayers: ActivePlayer[];
}

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

    // Profile Management
    const addProfile = useCallback(() => {
        const newProfile: UserProfile = {
            id: crypto.randomUUID(),
            name: `Player ${profiles.length + 1}`,
            hue: COLOR_PRESETS[profiles.length % COLOR_PRESETS.length].hue
        };
        setProfiles(prev => [...prev, newProfile]);
    }, [profiles.length]);

    const updateProfile = useCallback((id: string, updates: Partial<UserProfile>) => {
        setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }, []);

    const deleteProfile = useCallback((id: string) => {
        setProfiles(prev => prev.filter(p => p.id !== id));
        setActivePlayers(prev => prev.filter(ap => ap.profileId !== id));
    }, []);

    // Session Selection
    const toggleActivePlayer = useCallback((profileId: string) => {
        setActivePlayers(prev => {
            if (prev.some(ap => ap.profileId === profileId)) {
                // Remove
                return prev.filter(ap => ap.profileId !== profileId);
            } else {
                // Add (Initialize with empty device or first available)
                const usedDevices = prev.map(ap => ap.deviceId).filter(Boolean);
                const nextDevice = devices.find(d => !usedDevices.includes(d.deviceId))?.deviceId || '';

                return [...prev, {
                    profileId,
                    deviceId: nextDevice,
                    volume: 0.8,
                    muted: true,
                    latency: 0
                }];
            }
        });
    }, [devices]);

    const moveActivePlayer = useCallback((index: number, direction: 'up' | 'down') => {
        setActivePlayers(prev => {
            const newActive = [...prev];
            if (direction === 'up' && index > 0) {
                [newActive[index], newActive[index - 1]] = [newActive[index - 1], newActive[index]];
            } else if (direction === 'down' && index < newActive.length - 1) {
                [newActive[index], newActive[index + 1]] = [newActive[index + 1], newActive[index]];
            }
            return newActive;
        });
    }, []);

    const updateActivePlayerConfig = useCallback((profileId: string, updates: Partial<ActivePlayer>) => {
        setActivePlayers(prev => prev.map(ap => ap.profileId === profileId ? { ...ap, ...updates } : ap));
    }, []);

    // Save to localStorage
    const saveProfiles = useCallback(() => {
        localStorage.setItem('melodiq_profiles', JSON.stringify(profiles));
        localStorage.setItem('melodiq_active_session', JSON.stringify(activePlayers));
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
        saveProfiles
    };
};

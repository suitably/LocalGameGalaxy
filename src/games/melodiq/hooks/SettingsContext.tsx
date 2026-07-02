import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface SettingsState {
    showDebugOverlay: boolean;
    showDevSlider: boolean;
    showNoteLabels: boolean;
    showVideoErrors: boolean;
    customLayouts: Record<number, string>;
    cardSize: string;
    customTarget: number;
    songVolume: number;
    masterVolume: number;
    vocalsVolume: number;
    helperUrl: string;
    enableHelper: boolean;
    goldenNoteMultiplier: number;
    defaultSongClickAction: 'play_now' | 'play_next' | 'add_end';
    defaultViewMode: 'list' | 'grid';
    autoplayNoPlayersDelay: number;
    autoplayWithPlayersDelay: number;
    hideBackgroundVideo: boolean;
    fallbackBackgroundUrl: string;
    lyricsScale: number;
}

/** Default/Factory settings */
export const DEFAULT_SETTINGS: SettingsState = {
    showDebugOverlay: false,
    showDevSlider: false,
    showNoteLabels: true,
    showVideoErrors: false,
    customLayouts: { 1: '1', 2: '1.1', 3: '1.2', 4: '2.2' },
    cardSize: 'small',
    customTarget: 6,
    songVolume: 0.7,
    masterVolume: 1.0,
    vocalsVolume: 1.0,
    helperUrl: 'http://localhost:3000',
    enableHelper: false,
    goldenNoteMultiplier: 2.0,
    defaultSongClickAction: 'add_end',
    defaultViewMode: 'list',
    autoplayNoPlayersDelay: 10,
    autoplayWithPlayersDelay: 0,
    hideBackgroundVideo: false,
    fallbackBackgroundUrl: '',
    lyricsScale: 1.0
};

export const loadSettings = (): SettingsState => ({
    showDebugOverlay: localStorage.getItem('melodiq_show_overlay') === 'true',
    showDevSlider: localStorage.getItem('melodiq_show_slider') === 'true',
    showNoteLabels: (() => {
        const stored = localStorage.getItem('melodiq_show_note_labels');
        return stored === null ? true : stored === 'true';
    })(),
    showVideoErrors: localStorage.getItem('melodiq_show_video_errors') === 'true',
    customLayouts: (() => {
        const stored = localStorage.getItem('melodiq_custom_layouts');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { console.error('Failed to parse custom layouts', e); }
        }
        return { 1: '1', 2: '1.1', 3: '1.2', 4: '2.2' };
    })(),
    cardSize: localStorage.getItem('melodiq_card_size') || 'small',
    customTarget: (() => {
        const stored = localStorage.getItem('melodiq_custom_target_columns');
        return stored ? parseInt(stored) : 6;
    })(),
    songVolume: (() => {
        const stored = localStorage.getItem('melodiq_song_volume');
        return stored ? parseFloat(stored) : 0.7;
    })(),
    masterVolume: (() => {
        const stored = localStorage.getItem('melodiq_master_volume');
        return stored ? parseFloat(stored) : 1.0;
    })(),
    vocalsVolume: (() => {
        const stored = localStorage.getItem('melodiq_vocals_volume');
        return stored ? parseFloat(stored) : 1.0;
    })(),
    helperUrl: localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000',
    enableHelper: localStorage.getItem('melodiq_enable_helper') === 'true',
    goldenNoteMultiplier: (() => {
        const stored = localStorage.getItem('melodiq_golden_note_multiplier');
        return stored ? parseFloat(stored) : 2.0;
    })(),
    defaultSongClickAction: (localStorage.getItem('melodiq_default_song_click_action') as any) || 'add_end',
    defaultViewMode: (localStorage.getItem('melodiq_default_view_mode') as any) || 'list',
    autoplayNoPlayersDelay: (() => {
        const stored = localStorage.getItem('melodiq_autoplay_no_players');
        return stored ? parseInt(stored) : 10;
    })(),
    autoplayWithPlayersDelay: (() => {
        const stored = localStorage.getItem('melodiq_autoplay_with_players');
        return stored ? parseInt(stored) : 0;
    })(),
    hideBackgroundVideo: localStorage.getItem('melodiq_hide_background_video') === 'true',
    fallbackBackgroundUrl: localStorage.getItem('melodiq_fallback_background_url') || '',
    lyricsScale: (() => {
        const stored = localStorage.getItem('melodiq_lyrics_scale');
        return stored ? parseFloat(stored) : 1.0;
    })()
});

const persistSettings = (s: SettingsState) => {
    localStorage.setItem('melodiq_show_overlay', String(s.showDebugOverlay));
    localStorage.setItem('melodiq_show_slider', String(s.showDevSlider));
    localStorage.setItem('melodiq_show_note_labels', String(s.showNoteLabels));
    localStorage.setItem('melodiq_show_video_errors', String(s.showVideoErrors));
    localStorage.setItem('melodiq_custom_layouts', JSON.stringify(s.customLayouts));
    localStorage.setItem('melodiq_card_size', s.cardSize);
    localStorage.setItem('melodiq_custom_target_columns', String(s.customTarget));
    localStorage.setItem('melodiq_song_volume', String(s.songVolume));
    localStorage.setItem('melodiq_master_volume', String(s.masterVolume));
    localStorage.setItem('melodiq_vocals_volume', String(s.vocalsVolume));
    localStorage.setItem('melodiq_helper_url', s.helperUrl);
    localStorage.setItem('melodiq_enable_helper', String(s.enableHelper));
    localStorage.setItem('melodiq_golden_note_multiplier', String(s.goldenNoteMultiplier));
    localStorage.setItem('melodiq_default_song_click_action', s.defaultSongClickAction);
    localStorage.setItem('melodiq_default_view_mode', s.defaultViewMode);
    localStorage.setItem('melodiq_autoplay_no_players', String(s.autoplayNoPlayersDelay));
    localStorage.setItem('melodiq_autoplay_with_players', String(s.autoplayWithPlayersDelay));
    localStorage.setItem('melodiq_hide_background_video', String(s.hideBackgroundVideo));
    localStorage.setItem('melodiq_fallback_background_url', s.fallbackBackgroundUrl);
    localStorage.setItem('melodiq_lyrics_scale', String(s.lyricsScale));
};

interface SettingsContextValue {
    settings: SettingsState;
    updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
    resetSettings: (newState: SettingsState) => void;
    saveSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SettingsState>(loadSettings);

    const updateSetting = useCallback(<K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
        setSettings(prev => {
            const next = { ...prev, [key]: value };
            persistSettings(next);
            return next;
        });
    }, []);

    const resetSettings = useCallback((newState: SettingsState) => {
        setSettings(newState);
        persistSettings(newState);
    }, []);

    const saveSettings = useCallback(() => {
        persistSettings(settings);
    }, [settings]);

    // Listen for cross-tab storage changes so settings sync if changed in another tab
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key && e.key.startsWith('melodiq_')) {
                setSettings(loadSettings());
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // Parse URL parameters for initial setup
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        let updated = false;
        
        const urlHelper = params.get('helperUrl');
        const urlToken = params.get('token') || params.get('apiKey');

        if (urlHelper) {
            localStorage.setItem('melodiq_helper_url', urlHelper);
            localStorage.setItem('melodiq_enable_helper', 'true');
            params.delete('helperUrl');
            updated = true;
        }

        if (urlToken) {
            localStorage.setItem('melodiq_helper_token', urlToken);
            params.delete('token');
            params.delete('apiKey');
            updated = true;
        }

        if (updated) {
            // Update the URL without reloading the page
            const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '') + window.location.hash;
            window.history.replaceState({}, '', newUrl);
            
            // Apply the new settings to the state immediately
            setSettings(loadSettings());
        }
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, saveSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

/** Consume the shared settings context. Must be used within a SettingsProvider. */
export const useMelodiqSettings = (): SettingsContextValue => {
    const ctx = useContext(SettingsContext);
    if (!ctx) {
        throw new Error('useMelodiqSettings must be used within a <SettingsProvider>');
    }
    return ctx;
};

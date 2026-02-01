import { useState, useCallback } from 'react';

export interface SettingsState {
    showDebugOverlay: boolean;
    showDevSlider: boolean;
    showMicStatus: boolean;
    showNoteLabels: boolean;
    showVideoErrors: boolean;
    layoutOverride: string;
    cardSize: string;
    customTarget: number;
    songVolume: number;
    masterVolume: number;
    helperUrl: string;
    enableHelper: boolean;
    goldenNoteMultiplier: number;
}

/** Default/Factory settings */
export const DEFAULT_SETTINGS: SettingsState = {
    showDebugOverlay: false,
    showDevSlider: false,
    showMicStatus: true,
    showNoteLabels: true,
    showVideoErrors: false,
    layoutOverride: '',
    cardSize: 'small',
    customTarget: 6,
    songVolume: 0.7,
    masterVolume: 1.0,
    helperUrl: 'http://localhost:3000',
    enableHelper: false,
    goldenNoteMultiplier: 2.0
};

const loadSettings = (): SettingsState => ({
    showDebugOverlay: localStorage.getItem('melodiq_show_overlay') === 'true',
    showDevSlider: localStorage.getItem('melodiq_show_slider') === 'true',
    showMicStatus: (() => {
        const stored = localStorage.getItem('melodiq_show_mic_status');
        return stored === null ? true : stored === 'true';
    })(),
    showNoteLabels: (() => {
        const stored = localStorage.getItem('melodiq_show_note_labels');
        return stored === null ? true : stored === 'true';
    })(),
    showVideoErrors: localStorage.getItem('melodiq_show_video_errors') === 'true',
    layoutOverride: localStorage.getItem('melodiq_layout_override') || '',
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
    helperUrl: localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000',
    enableHelper: localStorage.getItem('melodiq_enable_helper') === 'true',
    goldenNoteMultiplier: (() => {
        const stored = localStorage.getItem('melodiq_golden_note_multiplier');
        return stored ? parseFloat(stored) : 2.0;
    })()
});

const persistSettings = (s: SettingsState) => {
    localStorage.setItem('melodiq_show_overlay', String(s.showDebugOverlay));
    localStorage.setItem('melodiq_show_slider', String(s.showDevSlider));
    localStorage.setItem('melodiq_show_mic_status', String(s.showMicStatus));
    localStorage.setItem('melodiq_show_note_labels', String(s.showNoteLabels));
    localStorage.setItem('melodiq_show_video_errors', String(s.showVideoErrors));
    localStorage.setItem('melodiq_layout_override', s.layoutOverride);
    localStorage.setItem('melodiq_card_size', s.cardSize);
    localStorage.setItem('melodiq_custom_target_columns', String(s.customTarget));
    localStorage.setItem('melodiq_song_volume', String(s.songVolume));
    localStorage.setItem('melodiq_master_volume', String(s.masterVolume));
    localStorage.setItem('melodiq_helper_url', s.helperUrl);
    localStorage.setItem('melodiq_enable_helper', String(s.enableHelper));
    localStorage.setItem('melodiq_golden_note_multiplier', String(s.goldenNoteMultiplier));
};

export const useSettings = () => {
    const [settings, setSettings] = useState<SettingsState>(loadSettings);

    const updateSetting = useCallback(<K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
        setSettings(prev => {
            const next = { ...prev, [key]: value };
            persistSettings(next); // Instant save
            return next;
        });
    }, []);

    /** Replace all settings (for undo/reset) */
    const resetSettings = useCallback((newState: SettingsState) => {
        setSettings(newState);
        persistSettings(newState);
    }, []);

    // saveSettings kept for compatibility but now optional
    const saveSettings = useCallback(() => {
        persistSettings(settings);
    }, [settings]);

    return {
        settings,
        updateSetting,
        resetSettings,
        saveSettings
    };
};

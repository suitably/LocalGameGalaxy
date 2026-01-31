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
}

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
    })()
});

export const useSettings = () => {
    const [settings, setSettings] = useState<SettingsState>(loadSettings);

    const updateSetting = useCallback(<K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    const saveSettings = useCallback(() => {
        localStorage.setItem('melodiq_show_overlay', String(settings.showDebugOverlay));
        localStorage.setItem('melodiq_show_slider', String(settings.showDevSlider));
        localStorage.setItem('melodiq_show_mic_status', String(settings.showMicStatus));
        localStorage.setItem('melodiq_show_note_labels', String(settings.showNoteLabels));
        localStorage.setItem('melodiq_show_video_errors', String(settings.showVideoErrors));
        localStorage.setItem('melodiq_layout_override', settings.layoutOverride);
        localStorage.setItem('melodiq_card_size', settings.cardSize);
        localStorage.setItem('melodiq_custom_target_columns', String(settings.customTarget));
        localStorage.setItem('melodiq_song_volume', String(settings.songVolume));
        localStorage.setItem('melodiq_master_volume', String(settings.masterVolume));
    }, [settings]);

    return {
        settings,
        updateSetting,
        saveSettings
    };
};

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Typography, Paper, FormControlLabel,
    Switch, Select, MenuItem, FormControl, InputLabel,
    CircularProgress, Alert, FormHelperText
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { storage } from '../../lib/storage';
import { settingsCardSx } from '../../features/settings/settingsStyles';
import { melodiqFetch } from '../../games/melodiq';
import type { ServerPreferencesResponse, DownloadMode } from './serverConfigTypes';

export const ServerPreferences: React.FC = () => {
    const { t } = useTranslation();
    const [isServerActive, setIsServerActive] = useState(() => storage.isHelperActive());
    const [downloadMode, setDownloadMode] = useState<DownloadMode>('stream');
    const [autoSeparation, setAutoSeparation] = useState(false);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadPreferences = useCallback(async () => {
        if (!storage.isHelperActive()) return;
        setLoading(true);
        setError(null);
        try {
            const data = await melodiqFetch<ServerPreferencesResponse>('/api/config/preferences');
            if (data?.defaultDownloadMode) {
                setDownloadMode(data.defaultDownloadMode);
            }
            if (typeof data?.autoVocalSeparation === 'boolean') {
                setAutoSeparation(data.autoVocalSeparation);
            }
        } catch {
            // Ignore load failures silently on initial render
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const handleUpdate = () => {
            const active = storage.isHelperActive();
            setIsServerActive(active);
            if (active) {
                loadPreferences();
            }
        };

        handleUpdate();
        window.addEventListener('server_connection_updated', handleUpdate);
        return () => window.removeEventListener('server_connection_updated', handleUpdate);
    }, [loadPreferences]);

    const savePreferences = async (newMode: DownloadMode, newAutoSep: boolean) => {
        setSaving(true);
        setError(null);
        setSavedNotice(false);
        try {
            await melodiqFetch('/api/config/preferences', {
                method: 'POST',
                body: JSON.stringify({
                    defaultDownloadMode: newMode,
                    autoVocalSeparation: newAutoSep,
                })
            });
            setSavedNotice(true);
            setTimeout(() => setSavedNotice(false), 3000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('server.preferences.error_save', 'Failed to save preferences');
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleModeChange = (mode: DownloadMode) => {
        setDownloadMode(mode);
        savePreferences(mode, autoSeparation);
    };

    const handleAutoSeparationChange = (checked: boolean) => {
        setAutoSeparation(checked);
        savePreferences(downloadMode, checked);
    };

    if (!isServerActive) {
        return null;
    }

    return (
        <Paper sx={settingsCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                    <Typography variant="h6">{t('server.preferences.title', 'Server Preferences')}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('server.preferences.desc', 'Configure download behaviors and audio processing options.')}
                    </Typography>
                </Box>
                {savedNotice && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                        <CheckCircleIcon fontSize="small" />
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {t('server.preferences.saved', 'Saved')}
                        </Typography>
                    </Box>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ my: 1.5 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={28} />
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    {/* Video Download Mode */}
                    <Box>
                        <FormControl fullWidth size="small" disabled={saving}>
                            <InputLabel id="download-mode-label">
                                {t('server.preferences.download_mode', 'Video Download Mode')}
                            </InputLabel>
                            <Select
                                labelId="download-mode-label"
                                value={downloadMode}
                                label={t('server.preferences.download_mode', 'Video Download Mode')}
                                onChange={(e) => handleModeChange(e.target.value as DownloadMode)}
                            >
                                <MenuItem value="stream">
                                    {t('server.preferences.mode_stream', 'Stream video (Recommended)')}
                                </MenuItem>
                                <MenuItem value="mp4">
                                    {t('server.preferences.mode_mp4', 'Download video (MP4)')}
                                </MenuItem>
                                <MenuItem value="none">
                                    {t('server.preferences.mode_none', 'Audio only (No video)')}
                                </MenuItem>
                            </Select>
                            <FormHelperText>
                                {t('server.preferences.download_mode_desc', 'Determines whether videos are downloaded or streamed.')}
                            </FormHelperText>
                        </FormControl>
                    </Box>

                    {/* Auto Vocal Separation */}
                    <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={autoSeparation}
                                    onChange={(e) => handleAutoSeparationChange(e.target.checked)}
                                    disabled={saving}
                                    color="primary"
                                />
                            }
                            label={
                                <Typography variant="subtitle2">
                                    {t('server.preferences.auto_separation', 'Automatic AI Vocal Separation')}
                                </Typography>
                            }
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
                            {t('server.preferences.auto_separation_desc', 'Automatically isolate vocals and instrumental stems when downloading new songs.')}
                        </Typography>
                    </Box>
                </Box>
            )}
        </Paper>
    );
};

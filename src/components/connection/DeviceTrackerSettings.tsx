import React, { useState, useMemo } from 'react';
import { Box, Button, Typography, TextField, IconButton, Paper, Chip, Tooltip, Switch } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type { TrackerItem } from '../../lib/webrtc';

export interface DeviceTrackerSettingsProps {
    allTrackers?: TrackerItem[];
    activeTrackerUrls?: string[];
    trackerUrls?: string[];
    toggleTrackerActive?: (url: string, enabled?: boolean) => void;
    addTrackerUrl: (url: string) => void;
    removeTrackerUrl: (url: string) => void;
    restoreDefaultTrackers: () => void;
}

export const DeviceTrackerSettings: React.FC<DeviceTrackerSettingsProps> = ({
    allTrackers: contextAllTrackers,
    activeTrackerUrls = [],
    trackerUrls = [],
    toggleTrackerActive,
    addTrackerUrl,
    removeTrackerUrl,
    restoreDefaultTrackers,
}) => {
    const { t } = useTranslation();
    const [newTrackerUrl, setNewTrackerUrl] = useState('');

    const trackersToDisplay: TrackerItem[] = useMemo(() => {
        if (contextAllTrackers && contextAllTrackers.length > 0) {
            return contextAllTrackers;
        }
        const allUrls = Array.from(new Set([...activeTrackerUrls, ...trackerUrls]));
        return allUrls.map(url => ({
            url,
            type: trackerUrls.includes(url) ? ('custom' as const) : ('public' as const),
            enabled: activeTrackerUrls.includes(url)
        }));
    }, [contextAllTrackers, activeTrackerUrls, trackerUrls]);

    const handleAddTracker = () => {
        const trimmed = newTrackerUrl.trim();
        if (trimmed) {
            addTrackerUrl(trimmed);
            setNewTrackerUrl('');
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2">{t('signaling.title', 'Signaling Servers (Trackers)')}</Typography>
                <Button
                    size="small"
                    onClick={restoreDefaultTrackers}
                    variant="outlined"
                    sx={{ borderRadius: 50 }}
                >
                    {t('signaling.restore_defaults', 'Restore Defaults')}
                </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {trackersToDisplay.map((item, index: number) => {
                    const isCustom = item.type === 'custom';
                    const isBackend = item.type === 'backend';
                    const isPublic = item.type === 'public';

                    return (
                        <Paper
                            key={item.url || index}
                            elevation={0}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                p: 1,
                                px: 1.5,
                                borderRadius: 2,
                                bgcolor: item.enabled ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid',
                                borderColor: item.enabled ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                                opacity: item.enabled ? 1 : 0.6,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <Tooltip title={item.enabled ? t('signaling.toggle_disable', 'Disable server') : t('signaling.toggle_enable', 'Enable server')}>
                                <Switch
                                    size="small"
                                    checked={item.enabled}
                                    onChange={() => {
                                        if (toggleTrackerActive) {
                                            toggleTrackerActive(item.url, !item.enabled);
                                        } else if (item.enabled) {
                                            removeTrackerUrl(item.url);
                                        } else {
                                            addTrackerUrl(item.url);
                                        }
                                    }}
                                    color={isBackend ? 'success' : isPublic ? 'primary' : 'secondary'}
                                />
                            </Tooltip>

                            <TextField
                                value={item.url}
                                size="small"
                                fullWidth
                                variant="standard"
                                InputProps={{
                                    readOnly: true,
                                    disableUnderline: true,
                                    sx: {
                                        fontFamily: 'monospace',
                                        fontSize: '0.85rem',
                                        color: item.enabled ? 'text.primary' : 'text.disabled'
                                    }
                                }}
                            />

                            {isBackend && (
                                <Chip
                                    label={t('signaling.type_backend', 'Self-Hosted')}
                                    color="success"
                                    variant="outlined"
                                    size="small"
                                    sx={{ height: 26, px: 0.5, borderRadius: 1.5, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                />
                            )}
                            {isPublic && (
                                <Chip
                                    label={t('signaling.type_public', 'Free / Public')}
                                    color="info"
                                    variant="outlined"
                                    size="small"
                                    sx={{ height: 26, px: 0.5, borderRadius: 1.5, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                />
                            )}
                            {isCustom && (
                                <Chip
                                    label={t('signaling.type_custom', 'Custom')}
                                    color="secondary"
                                    variant="outlined"
                                    size="small"
                                    sx={{ height: 26, px: 0.5, borderRadius: 1.5, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                />
                            )}

                            {isCustom && (
                                <Tooltip title={t('signaling.remove_tooltip', 'Remove tracker')}>
                                    <IconButton
                                        color="error"
                                        size="small"
                                        onClick={() => removeTrackerUrl(item.url)}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Paper>
                    );
                })}

                {activeTrackerUrls.length === 0 && (
                    <Box sx={{ p: 2, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 2 }}>
                        <Typography variant="body2" color="error">
                            {t('signaling.no_trackers_warning', '⚠️ No active signaling servers configured. Connection to mobile devices will not be possible. Please enable at least one server.')}
                        </Typography>
                    </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <TextField
                        value={newTrackerUrl}
                        onChange={(e) => setNewTrackerUrl(e.target.value)}
                        placeholder={t('signaling.placeholder', 'wss://tracker.example.com')}
                        size="small"
                        fullWidth
                        variant="outlined"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTracker();
                            }
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleAddTracker}
                        sx={{
                            borderRadius: 50,
                            px: 4,
                            py: 1,
                            backgroundImage: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                            boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                            color: 'white'
                        }}
                    >
                        {t('signaling.add_button', 'Add')}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

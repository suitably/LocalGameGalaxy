import React from 'react';
import { Box, Typography, Paper, TextField, Button, Chip } from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import { useTranslation } from 'react-i18next';
import { useSignalingTrackerState } from './useSignalingTrackerState';
import { DeviceTrackerSettings } from '../../../../components/connection/DeviceTrackerSettings';
import { settingsCardSx } from '../../settingsStyles';

export const SignalingSettingsCard: React.FC = () => {
    const { t } = useTranslation();
    const {
        customSignalingUrl,
        handleSignalingUrlChange,
        healthStatus,
        healthDetails,
        checkSignalingHealth,
        allTrackers,
        activeTrackerUrls,
        trackerUrls,
        toggleTrackerActive,
        addTrackerUrl,
        removeTrackerUrl,
        restoreDefaultTrackers,
    } = useSignalingTrackerState();

    return (
        <Paper id="settings-section-signaling" sx={settingsCardSx}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <HubIcon color="primary" sx={{ fontSize: 30 }} />
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                            {t('settings.signaling_title', 'WebRTC Signaling Service (Plattform-Infrastruktur)')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t('settings.signaling_desc', 'Koordiniert P2P-Verbindungen, TV-Modus und Smartphone-Mikrofone für alle Party-Spiele (Port 8000).')}
                        </Typography>
                    </Box>
                </Box>

                {/* Signaling Server URL & Connection Check */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField
                        size="small"
                        fullWidth
                        label={t('settings.signaling_url_label', 'Signaling Server WebSocket URL')}
                        placeholder="ws://localhost:8000"
                        value={customSignalingUrl}
                        onChange={(e) => handleSignalingUrlChange(e.target.value)}
                        helperText={t('settings.signaling_url_hint', 'Leer lassen für automatische Port-8000-Ermittlung vom verbundenen Host.')}
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={checkSignalingHealth}
                            disabled={healthStatus === 'checking'}
                            startIcon={<SyncRoundedIcon />}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            {t('settings.signaling_test', 'Status prüfen')}
                        </Button>

                        {healthStatus === 'online' && (
                            <Chip
                                icon={<CheckCircleRoundedIcon />}
                                label={healthDetails}
                                color="success"
                                size="small"
                                variant="outlined"
                            />
                        )}
                        {healthStatus === 'offline' && (
                            <Chip
                                icon={<ErrorRoundedIcon />}
                                label={healthDetails}
                                color="error"
                                size="small"
                                variant="outlined"
                            />
                        )}
                        {healthStatus === 'checking' && (
                            <Typography variant="body2" color="text.secondary">
                                {healthDetails}
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* All Trackers & Fallbacks */}
                <Box sx={{ mt: 1 }}>
                    <DeviceTrackerSettings
                        allTrackers={allTrackers}
                        activeTrackerUrls={activeTrackerUrls}
                        trackerUrls={trackerUrls}
                        toggleTrackerActive={toggleTrackerActive}
                        addTrackerUrl={addTrackerUrl}
                        removeTrackerUrl={removeTrackerUrl}
                        restoreDefaultTrackers={restoreDefaultTrackers}
                    />
                </Box>
            </Box>
        </Paper>
    );
};

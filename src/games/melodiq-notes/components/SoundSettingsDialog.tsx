import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Stack, Select, MenuItem,
    FormControl, InputLabel, TextField, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    getStoredSoundConfig,
    saveStoredSoundConfig,
    type SoundfontProvider,
    type InstrumentSoundConfig
} from '../logic/soundSettings';
import { useAudioSynth } from '../useAudioSynth';

interface SoundSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    onConfigChanged?: () => void;
}

export const SoundSettingsDialog: React.FC<SoundSettingsDialogProps> = ({
    open,
    onClose,
    onConfigChanged,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [config, setConfig] = useState<InstrumentSoundConfig>(getStoredSoundConfig);
    const { playInstrumentNote } = useAudioSynth();

    const handleProviderChange = (provider: SoundfontProvider) => {
        const next = { ...config, provider };
        setConfig(next);
        saveStoredSoundConfig(next);
        onConfigChanged?.();
    };

    const handleTestSound = () => {
        playInstrumentNote({
            midiPitch: 64, // E4
            durationSeconds: 0.7,
            velocity: 0.9,
            category: 'guitar',
            midiProgram: 27,
        });
    };

    const handleOpenFullSettings = () => {
        onClose();
        navigate('/settings?tab=melodiq-notes&from=/games/melodiq-notes');
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#1a1a2e',
                    backgroundImage: 'none',
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                    {t('games.melodiq_notes.sound_settings', 'Sound-Einstellungen')}
                </Typography>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                <Stack spacing={2.5}>
                    <FormControl fullWidth size="small">
                        <InputLabel>{t('games.melodiq_notes.soundfont_provider')}</InputLabel>
                        <Select
                            value={config.provider}
                            label={t('games.melodiq_notes.soundfont_provider')}
                            onChange={(e) => handleProviderChange(e.target.value as SoundfontProvider)}
                        >
                            <MenuItem value="fluid">{t('games.melodiq_notes.soundfont_fluid')}</MenuItem>
                            <MenuItem value="musyng">{t('games.melodiq_notes.soundfont_musyng')}</MenuItem>
                            <MenuItem value="synth">{t('games.melodiq_notes.soundfont_synth')}</MenuItem>
                            <MenuItem value="custom">{t('games.melodiq_notes.soundfont_custom')}</MenuItem>
                        </Select>
                    </FormControl>

                    {config.provider === 'custom' && (
                        <TextField
                            fullWidth
                            size="small"
                            label={t('games.melodiq_notes.soundfont_custom')}
                            value={config.customBaseUrl || ''}
                            onChange={(e) => {
                                const next = { ...config, customBaseUrl: e.target.value };
                                setConfig(next);
                                saveStoredSoundConfig(next);
                                onConfigChanged?.();
                            }}
                        />
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                            Sound testen:
                        </Typography>
                        <Button
                            startIcon={<VolumeUpIcon />}
                            variant="outlined"
                            size="small"
                            onClick={handleTestSound}
                        >
                            {t('games.melodiq_notes.test_sound', 'Probe anhören')}
                        </Button>
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Button
                    startIcon={<SettingsIcon />}
                    size="small"
                    color="secondary"
                    onClick={handleOpenFullSettings}
                >
                    Alle Sound-Settings
                </Button>
                <Button variant="contained" onClick={onClose}>
                    {t('common.done', 'Fertig')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

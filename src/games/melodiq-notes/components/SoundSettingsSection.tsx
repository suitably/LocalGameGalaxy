import React, { useState } from 'react';
import {
    Box, Typography, Button, Stack, Select, MenuItem,
    FormControl, InputLabel, TextField, Tooltip
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { useTranslation } from 'react-i18next';
import {
    getStoredSoundConfig,
    saveStoredSoundConfig,
    type SoundfontProvider,
    type InstrumentSoundConfig
} from '../logic/soundSettings';
import { useAudioSynth } from '../useAudioSynth';

interface SoundSettingsSectionProps {
    partsCount: number;
    onOpenMixer?: () => void;
    onSoundConfigChanged?: () => void;
}

export const SoundSettingsSection: React.FC<SoundSettingsSectionProps> = ({
    partsCount,
    onOpenMixer,
    onSoundConfigChanged,
}) => {
    const { t } = useTranslation();
    const [config, setConfig] = useState<InstrumentSoundConfig>(getStoredSoundConfig);
    const { playInstrumentNote } = useAudioSynth();

    const handleProviderChange = (provider: SoundfontProvider) => {
        const next = { ...config, provider };
        setConfig(next);
        saveStoredSoundConfig(next);
        onSoundConfigChanged?.();
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

    return (
        <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', mb: 1.5 }}>
                {t('games.melodiq_notes.sound_settings', 'Sound & Klänge')}
            </Typography>
            <Stack spacing={1.5}>
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
                            onSoundConfigChanged?.();
                        }}
                    />
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.5 }}>
                    <Button
                        startIcon={<VolumeUpIcon />}
                        variant="outlined"
                        size="small"
                        onClick={handleTestSound}
                        sx={{ borderRadius: 2 }}
                    >
                        {t('games.melodiq_notes.test_sound', 'Probe anhören')}
                    </Button>

                    {partsCount > 1 && onOpenMixer && (
                        <Tooltip title={t('games.melodiq_notes.ensemble_mixer', 'Band-Mixer')}>
                            <Button
                                startIcon={<GraphicEqIcon />}
                                variant="outlined"
                                size="small"
                                onClick={onOpenMixer}
                                sx={{ borderRadius: 2 }}
                            >
                                Mixer ({partsCount})
                            </Button>
                        </Tooltip>
                    )}
                </Box>
            </Stack>
        </Box>
    );
};

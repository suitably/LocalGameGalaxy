import React, { useState } from 'react';
import {
    Box, Paper, Typography, Stack, Select, MenuItem,
    FormControl, InputLabel, TextField, Slider, IconButton, Button, Tooltip, Chip
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useTranslation } from 'react-i18next';
import {
    getStoredSoundConfig,
    saveStoredSoundConfig,
    DEFAULT_SOUND_CONFIG,
    type SoundfontProvider,
    type InstrumentSoundConfig,
} from '../../../games/melodiq-notes';
import { useAudioSynth } from '../../../games/melodiq-notes/useAudioSynth';
import { settingsCardSx } from '../settingsStyles';

interface MelodiqNotesSettingsCategoryProps {
    onBackToGame?: () => void;
}

const INSTRUMENT_LIST = [
    { id: 'flute', name: 'Flute / Alto Flute', category: 'flute' as const, defaultMidi: 74, previewPitch: 74 },
    { id: 'guitar_clean', name: 'Electric Guitar (Clean)', category: 'guitar' as const, defaultMidi: 28, previewPitch: 52 },
    { id: 'guitar_dist', name: 'Electric Guitar (Distortion)', category: 'guitar' as const, defaultMidi: 31, previewPitch: 52 },
    { id: 'guitar_acoustic', name: 'Acoustic Guitar', category: 'guitar' as const, defaultMidi: 26, previewPitch: 52 },
    { id: 'bass', name: 'Electric Bass', category: 'bass' as const, defaultMidi: 34, previewPitch: 40 },
    { id: 'strings', name: 'Violins / Strings', category: 'strings' as const, defaultMidi: 49, previewPitch: 69 },
    { id: 'piano', name: 'Acoustic Grand Piano', category: 'piano' as const, defaultMidi: 1, previewPitch: 60 },
    { id: 'drums', name: 'Drums / Percussion', category: 'drums' as const, defaultMidi: 119, previewPitch: 36 },
];

export const MelodiqNotesSettingsCategory: React.FC<MelodiqNotesSettingsCategoryProps> = ({ onBackToGame }) => {
    const { t } = useTranslation();
    const [config, setConfig] = useState<InstrumentSoundConfig>(getStoredSoundConfig);
    const { playInstrumentNote } = useAudioSynth();

    const handleProviderChange = (provider: SoundfontProvider) => {
        const next = { ...config, provider };
        setConfig(next);
        saveStoredSoundConfig(next);
    };

    const handleVolumeChange = (id: string, vol: number) => {
        const next = {
            ...config,
            volumes: { ...config.volumes, [id]: vol }
        };
        setConfig(next);
        saveStoredSoundConfig(next);
    };

    const handleCustomUrlChange = (id: string, url: string) => {
        const next = {
            ...config,
            customUrls: { ...config.customUrls, [id]: url }
        };
        setConfig(next);
        saveStoredSoundConfig(next);
    };

    const handleReset = () => {
        setConfig(DEFAULT_SOUND_CONFIG);
        saveStoredSoundConfig(DEFAULT_SOUND_CONFIG);
    };

    const handlePreview = (inst: typeof INSTRUMENT_LIST[0]) => {
        const volume = config.volumes[inst.id] !== undefined ? config.volumes[inst.id] : 1.0;
        playInstrumentNote({
            midiPitch: inst.previewPitch,
            durationSeconds: 0.8,
            velocity: 0.85,
            category: inst.category,
            midiProgram: inst.defaultMidi,
            partId: inst.id,
            volume,
        });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {onBackToGame && (
                <Box sx={{ mb: 1 }}>
                    <Button startIcon={<ArrowBackIcon />} onClick={onBackToGame} variant="outlined" size="small">
                        {t('common.back_to_game', 'Zurück zum Spiel')}
                    </Button>
                </Box>
            )}

            {/* Provider card */}
            <Paper sx={settingsCardSx}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <MusicNoteIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                        {t('games.melodiq_notes.soundfont_provider', 'Soundfont-Bibliothek')}
                    </Typography>
                    <Chip label="FOSS" size="small" color="success" variant="outlined" />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {t('settings.melodiq_notes_desc', 'Konfiguriere Sounds, Soundfonts und eigene Audio-Samples für Melodiq Notes.')}
                </Typography>

                <FormControl fullWidth size="small" sx={{ mb: config.provider === 'custom' ? 2 : 0 }}>
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
                        placeholder="https://example.com/soundfonts/"
                        onChange={(e) => {
                            const next = { ...config, customBaseUrl: e.target.value };
                            setConfig(next);
                            saveStoredSoundConfig(next);
                        }}
                    />
                )}
            </Paper>

            {/* Instrument mapping card */}
            <Paper sx={settingsCardSx}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6" fontWeight={700}>
                        {t('games.melodiq_notes.instruments', 'Instrumente')}
                    </Typography>
                    <Button
                        startIcon={<RestartAltIcon />}
                        size="small"
                        color="secondary"
                        onClick={handleReset}
                    >
                        {t('games.melodiq_notes.reset_foss', 'Auf FOSS-Standard zurücksetzen')}
                    </Button>
                </Stack>

                <Stack spacing={2.5}>
                    {INSTRUMENT_LIST.map((inst) => {
                        const vol = config.volumes[inst.id] !== undefined ? config.volumes[inst.id] : 1.0;
                        const customUrl = config.customUrls[inst.id] || '';

                        return (
                            <Paper
                                key={inst.id}
                                variant="outlined"
                                sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
                            >
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                                    <Box sx={{ minWidth: 160 }}>
                                        <Typography variant="subtitle2" fontWeight={600}>{inst.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">GM #{inst.defaultMidi}</Typography>
                                    </Box>

                                    <TextField
                                        size="small"
                                        label={t('games.melodiq_notes.custom_sound_url')}
                                        placeholder="Audio URL / Sample"
                                        value={customUrl}
                                        onChange={(e) => handleCustomUrlChange(inst.id, e.target.value)}
                                        sx={{ minWidth: 200, flex: 1 }}
                                    />

                                    <Box sx={{ width: 140, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Vol:</Typography>
                                        <Slider
                                            size="small"
                                            value={Math.round(vol * 100)}
                                            min={0}
                                            max={120}
                                            onChange={(_, val) => handleVolumeChange(inst.id, (val as number) / 100)}
                                        />
                                        <Typography variant="caption" sx={{ minWidth: 30 }}>{Math.round(vol * 100)}%</Typography>
                                    </Box>

                                    <Tooltip title={t('games.melodiq_notes.test_sound')}>
                                        <IconButton color="primary" onClick={() => handlePreview(inst)}>
                                            <VolumeUpIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            </Paper>
        </Box>
    );
};

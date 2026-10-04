import React from 'react';
import {
    Box, Typography, Stack, Button, IconButton,
    ToggleButtonGroup, ToggleButton, Chip, Tooltip
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import { useTranslation } from 'react-i18next';
import type { MelodiqNotesViewMode } from '../types';

interface MelodiqNotesHeaderProps {
    currentTitle: string;
    currentArtist: string;
    effectiveBpm: number;
    score: number;
    hitCount: number;
    viewMode: MelodiqNotesViewMode;
    partsCount: number;
    onViewModeChange: (mode: MelodiqNotesViewMode) => void;
    onOpenMixer: () => void;
    onOpenSoundSettings: () => void;
    onOpenSongSelect: () => void;
}

export const MelodiqNotesHeader: React.FC<MelodiqNotesHeaderProps> = ({
    currentTitle,
    currentArtist,
    effectiveBpm,
    score,
    hitCount,
    viewMode,
    partsCount,
    onViewModeChange,
    onOpenMixer,
    onOpenSoundSettings,
    onOpenSongSelect,
}) => {
    const { t } = useTranslation();

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
            {/* Song Meta & Selector Button */}
            <Stack direction="row" spacing={1.5} alignItems="center">
                <MusicNoteIcon sx={{ fontSize: 36, color: 'primary.main' }} />
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
                            {currentTitle}
                        </Typography>
                        <Chip label={`${effectiveBpm} BPM`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.68rem', color: 'text.secondary' }} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        {currentArtist}
                    </Typography>
                </Box>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<LibraryMusicIcon />}
                    onClick={onOpenSongSelect}
                    sx={{ ml: 1, textTransform: 'none', borderRadius: 2 }}
                >
                    {t('games.melodiq_notes.song', 'Song')}
                </Button>
            </Stack>

            {/* Middle: Score HUD */}
            <Stack direction="row" spacing={2.5} alignItems="center">
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">{t('games.melodiq_notes.score')}</Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">{score}</Typography>
                </Box>
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">{t('games.melodiq_notes.hits')}</Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.main">{hitCount}</Typography>
                </Box>
            </Stack>

            {/* Right: View Switcher & Action Dialogs */}
            <Stack direction="row" spacing={1.5} alignItems="center">
                <ToggleButtonGroup
                    size="small"
                    value={viewMode}
                    exclusive
                    onChange={(_, val) => val && onViewModeChange(val as MelodiqNotesViewMode)}
                >
                    <ToggleButton value="classic" sx={{ px: 1.5, py: 0.5, fontSize: '0.8rem' }}>
                        <MenuBookIcon sx={{ fontSize: 16, mr: 0.5 }} />
                        {t('games.melodiq_notes.view_classic', 'Notenblatt')}
                    </ToggleButton>
                    <ToggleButton value="modern" sx={{ px: 1.5, py: 0.5, fontSize: '0.8rem' }}>
                        <ElectricBoltIcon sx={{ fontSize: 16, mr: 0.5, color: '#f59e0b' }} />
                        {t('games.melodiq_notes.view_modern', 'Modern')}
                    </ToggleButton>
                </ToggleButtonGroup>

                {partsCount > 1 && (
                    <Tooltip title={t('games.melodiq_notes.ensemble_mixer', 'Band-Mixer')}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<GraphicEqIcon />}
                            onClick={onOpenMixer}
                            sx={{ borderRadius: 2, textTransform: 'none' }}
                        >
                            Mixer ({partsCount})
                        </Button>
                    </Tooltip>
                )}

                <Tooltip title={t('games.melodiq_notes.sound_settings', 'Sound-Einstellungen')}>
                    <IconButton size="small" onClick={onOpenSoundSettings} sx={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                        <SettingsIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>
        </Box>
    );
};

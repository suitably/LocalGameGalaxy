import React from 'react';
import {
    Box, Typography, Stack, Button, IconButton,
    ToggleButtonGroup, ToggleButton, Chip, Tooltip, useMediaQuery, useTheme
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1.5, sm: 2.5 }, flexWrap: 'wrap', gap: { xs: 1.5, sm: 2 } }}>
            {/* Song Meta & Selector Button */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ maxWidth: { xs: '100%', md: '50%' } }}>
                <MusicNoteIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'primary.main', flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                            variant={isMobile ? 'subtitle1' : 'h5'}
                            fontWeight="bold"
                            noWrap
                            sx={{ color: 'white', maxWidth: { xs: 160, sm: 280 } }}
                        >
                            {currentTitle}
                        </Typography>
                        <Chip
                            label={`${effectiveBpm} BPM`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem', color: 'text.secondary', flexShrink: 0 }}
                        />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 200 }}>
                        {currentArtist}
                    </Typography>
                </Box>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<LibraryMusicIcon />}
                    onClick={onOpenSongSelect}
                    sx={{ ml: 0.5, textTransform: 'none', borderRadius: 2, flexShrink: 0, px: { xs: 1, sm: 1.5 }, minWidth: { xs: 'auto', sm: 70 } }}
                >
                    {isMobile ? '' : t('games.melodiq_notes.song', 'Song')}
                </Button>
            </Stack>

            {/* Middle: Score HUD */}
            <Stack direction="row" spacing={{ xs: 2, sm: 3 }} alignItems="center">
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', letterSpacing: 0.5 }}>{t('games.melodiq_notes.score')}</Typography>
                    <Typography variant={isMobile ? 'subtitle1' : 'h5'} fontWeight="bold" color="primary.main">{score}</Typography>
                </Box>
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', letterSpacing: 0.5 }}>{t('games.melodiq_notes.hits')}</Typography>
                    <Typography variant={isMobile ? 'subtitle1' : 'h5'} fontWeight="bold" color="success.main">{hitCount}</Typography>
                </Box>
            </Stack>

            {/* Right: View Switcher & Action Dialogs */}
            <Stack direction="row" spacing={1} alignItems="center">
                <ToggleButtonGroup
                    size="small"
                    value={viewMode}
                    exclusive
                    onChange={(_, val) => val && onViewModeChange(val as MelodiqNotesViewMode)}
                >
                    <ToggleButton value="classic" sx={{ px: { xs: 1, sm: 1.5 }, py: 0.25, fontSize: '0.75rem' }}>
                        <MenuBookIcon sx={{ fontSize: 16, mr: { xs: 0, sm: 0.5 } }} />
                        {!isMobile && t('games.melodiq_notes.view_classic', 'Noten')}
                    </ToggleButton>
                    <ToggleButton value="modern" sx={{ px: { xs: 1, sm: 1.5 }, py: 0.25, fontSize: '0.75rem' }}>
                        <ElectricBoltIcon sx={{ fontSize: 16, mr: { xs: 0, sm: 0.5 }, color: '#f59e0b' }} />
                        {!isMobile && t('games.melodiq_notes.view_modern', 'Modern')}
                    </ToggleButton>
                </ToggleButtonGroup>

                {partsCount > 1 && (
                    <Tooltip title={t('games.melodiq_notes.ensemble_mixer', 'Band-Mixer')}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<GraphicEqIcon />}
                            onClick={onOpenMixer}
                            sx={{ borderRadius: 2, textTransform: 'none', px: { xs: 1, sm: 1.5 }, minWidth: { xs: 'auto', sm: 80 } }}
                        >
                            {isMobile ? `(${partsCount})` : `Mixer (${partsCount})`}
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

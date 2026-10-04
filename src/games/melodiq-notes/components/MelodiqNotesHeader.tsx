import React from 'react';
import {
    Box, Typography, Stack, Button, IconButton,
    Chip, Tooltip, useMediaQuery, useTheme
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import { useTranslation } from 'react-i18next';

interface MelodiqNotesHeaderProps {
    currentTitle: string;
    currentArtist: string;
    effectiveBpm: number;
    score: number;
    hitCount: number;
    partsCount: number;
    onOpenSongSelect: () => void;
    onOpenSettings: () => void;
    onOpenMixer: () => void;
}

export const MelodiqNotesHeader: React.FC<MelodiqNotesHeaderProps> = ({
    currentTitle,
    currentArtist,
    effectiveBpm,
    score,
    hitCount,
    partsCount,
    onOpenSongSelect,
    onOpenSettings,
    onOpenMixer,
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1.5 }}>
            {/* 1. Song Meta & Selector Button */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ maxWidth: { xs: '100%', md: '50%' } }}>
                <MusicNoteIcon sx={{ fontSize: { xs: 26, sm: 32 }, color: 'primary.main', flexShrink: 0 }} />
                <Button
                    size="small"
                    variant="text"
                    startIcon={<LibraryMusicIcon sx={{ color: 'primary.light' }} />}
                    onClick={onOpenSongSelect}
                    sx={{
                        textTransform: 'none',
                        borderRadius: 2,
                        p: 0.5,
                        textAlign: 'left',
                        color: 'inherit',
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography
                                variant={isMobile ? 'subtitle2' : 'subtitle1'}
                                fontWeight="bold"
                                noWrap
                                sx={{ color: 'white', maxWidth: { xs: 150, sm: 260 } }}
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
                            {currentArtist} • {t('games.melodiq_notes.change_song', 'Klicken zum Wechseln')}
                        </Typography>
                    </Box>
                </Button>
            </Stack>

            {/* 2. Middle & Right: Score HUD & Settings Actions */}
            <Stack direction="row" spacing={{ xs: 1.5, sm: 2.5 }} alignItems="center">
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', letterSpacing: 0.5 }}>
                        {t('games.melodiq_notes.score')}
                    </Typography>
                    <Typography variant={isMobile ? 'subtitle2' : 'subtitle1'} fontWeight="bold" color="primary.main">
                        {score}
                    </Typography>
                </Box>

                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', letterSpacing: 0.5 }}>
                        {t('games.melodiq_notes.hits')}
                    </Typography>
                    <Typography variant={isMobile ? 'subtitle2' : 'subtitle1'} fontWeight="bold" color="success.main">
                        {hitCount}
                    </Typography>
                </Box>

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

                <Tooltip title={t('games.melodiq_notes.settings', 'Einstellungen')}>
                    <IconButton
                        size="small"
                        onClick={onOpenSettings}
                        sx={{
                            border: '1px solid rgba(255,255,255,0.15)',
                            p: 0.75,
                            color: '#ffffff',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                    >
                        <SettingsIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>
        </Box>
    );
};

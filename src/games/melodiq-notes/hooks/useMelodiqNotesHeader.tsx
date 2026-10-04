import { useEffect } from 'react';
import { Box, Stack, Typography, Chip } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useTranslation } from 'react-i18next';
import { usePageTitle, useHeaderLayout } from '../../../context/LayoutContext';

interface UseMelodiqNotesHeaderOptions {
    currentTitle: string | null;
    currentArtist: string | null;
    effectiveBpm: number;
    partsCount: number;
    onOpenSongSelect: () => void;
    onOpenMixer: () => void;
    onOpenSettings: () => void;
}

export function useMelodiqNotesHeader({
    currentTitle,
    currentArtist,
    effectiveBpm,
    partsCount,
    onOpenSongSelect,
    onOpenMixer,
    onOpenSettings,
}: UseMelodiqNotesHeaderOptions) {
    const { t } = useTranslation();
    const { setMenuItems, setCustomHeaderTitle } = useHeaderLayout();

    usePageTitle(
        currentTitle
            ? `${currentTitle} - ${t('games.melodiq_notes.title')}`
            : t('games.melodiq_notes.title')
    );

    // 1. Clickable Song Title in GlobalHeader
    useEffect(() => {
        setCustomHeaderTitle(
            <Box
                onClick={onOpenSongSelect}
                role="button"
                tabIndex={0}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    maxWidth: '100%',
                    minWidth: 0,
                    cursor: 'pointer',
                    py: 0.5,
                    px: 1,
                    borderRadius: 2,
                    transition: 'background-color 0.2s',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
                }}
            >
                <MusicNoteIcon sx={{ color: 'primary.main', fontSize: { xs: 20, sm: 24 }, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                            variant="subtitle1"
                            fontWeight="bold"
                            noWrap
                            sx={{ color: '#ffffff', fontSize: { xs: '0.9rem', sm: '1.05rem' } }}
                        >
                            {currentTitle || t('games.melodiq_notes.title')}
                        </Typography>
                        {effectiveBpm ? (
                            <Chip
                                label={`${effectiveBpm} BPM`}
                                size="small"
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.65rem', color: 'text.secondary', flexShrink: 0 }}
                            />
                        ) : null}
                    </Stack>
                    {currentArtist && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', lineHeight: 1 }}>
                            {currentArtist}
                        </Typography>
                    )}
                </Box>
            </Box>
        );

        return () => {
            setCustomHeaderTitle(null);
        };
    }, [currentTitle, currentArtist, effectiveBpm, onOpenSongSelect, setCustomHeaderTitle, t]);

    // 2. Settings & Actions in GlobalHeader
    useEffect(() => {
        const items = [
            {
                label: t('games.melodiq_notes.song', 'Song wechseln'),
                icon: <LibraryMusicIcon fontSize="small" />,
                action: onOpenSongSelect,
                showAlways: true,
            },
            ...(partsCount > 1
                ? [
                      {
                          label: t('games.melodiq_notes.ensemble_mixer', 'Band-Mixer'),
                          icon: <GraphicEqIcon fontSize="small" />,
                          action: onOpenMixer,
                          showAlways: false,
                      },
                  ]
                : []),
            {
                label: t('games.melodiq_notes.settings', 'Einstellungen'),
                icon: <SettingsIcon fontSize="small" />,
                action: onOpenSettings,
                showAlways: true,
            },
        ];

        setMenuItems(items);

        return () => {
            setMenuItems([]);
        };
    }, [partsCount, onOpenSongSelect, onOpenMixer, onOpenSettings, setMenuItems, t]);
}

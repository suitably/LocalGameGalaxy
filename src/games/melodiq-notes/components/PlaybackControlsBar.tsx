import React, { useState } from 'react';
import {
    Paper, Stack, Button, Typography, Slider, Box,
    Popover, Chip, Tooltip, useTheme, useMediaQuery
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SpeedIcon from '@mui/icons-material/Speed';
import { useTranslation } from 'react-i18next';

interface PlaybackControlsBarProps {
    isPlaying: boolean;
    speedPercent: number;
    effectiveBpm: number;
    onTogglePlay: () => void;
    onReset: () => void;
    onSpeedPercentChange: (speed: number) => void;
}

export const PlaybackControlsBar: React.FC<PlaybackControlsBarProps> = ({
    isPlaying,
    speedPercent,
    effectiveBpm,
    onTogglePlay,
    onReset,
    onSpeedPercentChange,
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [speedAnchorEl, setSpeedAnchorEl] = useState<HTMLElement | null>(null);

    const handleOpenSpeed = (e: React.MouseEvent<HTMLElement>) => {
        setSpeedAnchorEl(e.currentTarget);
    };

    const handleCloseSpeed = () => {
        setSpeedAnchorEl(null);
    };

    return (
        <Paper
            elevation={3}
            sx={{
                mt: 2,
                p: { xs: 1, sm: 1.5 },
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
            }}
        >
            <Stack
                direction="row"
                spacing={{ xs: 1, sm: 1.5 }}
                alignItems="center"
                justifyContent="center"
            >
                {/* 1. Play / Pause Button (kompakt, icon-only auf Phone) */}
                <Tooltip title={isPlaying ? t('games.melodiq_notes.pause') : t('games.melodiq_notes.start_practice')}>
                    <Button
                        variant="contained"
                        color={isPlaying ? 'warning' : 'success'}
                        size="medium"
                        onClick={onTogglePlay}
                        sx={{
                            minWidth: { xs: 48, sm: 110 },
                            px: { xs: 1.5, sm: 2.5 },
                            py: 0.85,
                            borderRadius: 2.5,
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            textTransform: 'none',
                            boxShadow: isPlaying
                                ? '0 4px 14px rgba(245, 158, 11, 0.35)'
                                : '0 4px 14px rgba(34, 197, 94, 0.35)',
                        }}
                    >
                        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                        {!isMobile && (
                            <Box component="span" sx={{ ml: 1 }}>
                                {isPlaying ? t('games.melodiq_notes.pause') : t('games.melodiq_notes.start_practice')}
                            </Box>
                        )}
                    </Button>
                </Tooltip>

                {/* 2. Reset Button (kompakt, icon-only auf Phone) */}
                <Tooltip title={t('games.melodiq_notes.reset')}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        size="medium"
                        onClick={onReset}
                        sx={{
                            minWidth: { xs: 48, sm: 90 },
                            px: { xs: 1.5, sm: 2 },
                            py: 0.85,
                            borderRadius: 2.5,
                            borderColor: 'rgba(255,255,255,0.2)',
                            fontSize: '0.85rem',
                            textTransform: 'none',
                        }}
                    >
                        <RestartAltIcon />
                        {!isMobile && (
                            <Box component="span" sx={{ ml: 1 }}>
                                {t('games.melodiq_notes.reset')}
                            </Box>
                        )}
                    </Button>
                </Tooltip>

                {/* 3. Speed Button (öffnet Popover mit Regler) */}
                <Tooltip title={t('games.melodiq_notes.speed', 'Geschwindigkeit')}>
                    <Button
                        variant="outlined"
                        color={speedPercent !== 100 ? 'primary' : 'inherit'}
                        size="medium"
                        onClick={handleOpenSpeed}
                        sx={{
                            minWidth: { xs: 56, sm: 90 },
                            px: { xs: 1.25, sm: 2 },
                            py: 0.85,
                            borderRadius: 2.5,
                            borderColor: speedPercent !== 100 ? 'primary.main' : 'rgba(255,255,255,0.2)',
                            fontSize: '0.85rem',
                            fontWeight: speedPercent !== 100 ? 700 : 500,
                            textTransform: 'none',
                        }}
                    >
                        <SpeedIcon sx={{ mr: { xs: 0.5, sm: 1 }, fontSize: 18 }} />
                        {speedPercent}%
                    </Button>
                </Tooltip>

                {/* Speed Popover Slider */}
                <Popover
                    open={Boolean(speedAnchorEl)}
                    anchorEl={speedAnchorEl}
                    onClose={handleCloseSpeed}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    PaperProps={{
                        sx: {
                            p: 2,
                            width: 260,
                            bgcolor: '#181a2b',
                            borderRadius: 3,
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        }
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {t('games.melodiq_notes.speed', 'Geschwindigkeit')}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="primary.light">
                            {speedPercent}% ({effectiveBpm} BPM)
                        </Typography>
                    </Box>

                    <Slider
                        size="small"
                        value={speedPercent}
                        min={50}
                        max={150}
                        step={5}
                        onChange={(_, val) => onSpeedPercentChange(val as number)}
                        sx={{ mb: 1.5 }}
                    />

                    <Stack direction="row" spacing={1} justifyContent="center">
                        {[75, 100, 125].map(preset => (
                            <Chip
                                key={preset}
                                label={`${preset}%`}
                                size="small"
                                onClick={() => onSpeedPercentChange(preset)}
                                color={speedPercent === preset ? 'primary' : 'default'}
                                variant={speedPercent === preset ? 'filled' : 'outlined'}
                                sx={{ height: 24, fontSize: '0.75rem', cursor: 'pointer' }}
                            />
                        ))}
                    </Stack>
                </Popover>
            </Stack>
        </Paper>
    );
};

import React from 'react';
import {
    Paper, Stack, Button, Select, MenuItem,
    FormControl, InputLabel, Typography, Slider, Box
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SpeedIcon from '@mui/icons-material/Speed';
import MicIcon from '@mui/icons-material/Mic';
import PianoIcon from '@mui/icons-material/Piano';
import { useTranslation } from 'react-i18next';
import type { PlayMode, InputSource } from '../types';

interface PlaybackControlsBarProps {
    isPlaying: boolean;
    playMode: PlayMode;
    inputSource: InputSource;
    speedPercent: number;
    effectiveBpm: number;
    onTogglePlay: () => void;
    onReset: () => void;
    onPlayModeChange: (mode: PlayMode) => void;
    onInputSourceChange: (source: InputSource) => void;
    onSpeedPercentChange: (speed: number) => void;
}

export const PlaybackControlsBar: React.FC<PlaybackControlsBarProps> = ({
    isPlaying,
    playMode,
    inputSource,
    speedPercent,
    effectiveBpm,
    onTogglePlay,
    onReset,
    onPlayModeChange,
    onInputSourceChange,
    onSpeedPercentChange,
}) => {
    const { t } = useTranslation();

    return (
        <Paper
            elevation={3}
            sx={{
                mt: 3,
                p: 2,
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
            }}
        >
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={{ xs: 2, md: 2.5 }}
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
            >
                {/* Left: Play / Pause and Reset */}
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
                    <Button
                        variant="contained"
                        color={isPlaying ? 'warning' : 'success'}
                        size="medium"
                        startIcon={isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                        onClick={onTogglePlay}
                        sx={{
                            flex: { xs: 2, sm: 'none' },
                            px: { xs: 2, sm: 3.5 },
                            py: 1.25,
                            borderRadius: 2.5,
                            fontWeight: 'bold',
                            boxShadow: isPlaying
                                ? '0 4px 16px rgba(245, 158, 11, 0.35)'
                                : '0 4px 16px rgba(34, 197, 94, 0.35)',
                        }}
                    >
                        {isPlaying ? t('games.melodiq_notes.pause') : t('games.melodiq_notes.start_practice')}
                    </Button>

                    <Button
                        variant="outlined"
                        color="inherit"
                        size="medium"
                        startIcon={<RestartAltIcon />}
                        onClick={onReset}
                        sx={{
                            flex: { xs: 1, sm: 'none' },
                            borderRadius: 2.5,
                            borderColor: 'rgba(255,255,255,0.2)',
                            py: 1.25,
                        }}
                    >
                        {t('games.melodiq_notes.reset')}
                    </Button>
                </Stack>

                {/* Center: Mode & Input source */}
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ width: { xs: '100%', md: 'auto' } }}>
                    <FormControl size="small" sx={{ flex: { xs: 1, sm: 'none' }, minWidth: { xs: 120, sm: 140 } }}>
                        <InputLabel>{t('games.melodiq_notes.mode')}</InputLabel>
                        <Select
                            value={playMode}
                            label={t('games.melodiq_notes.mode')}
                            onChange={(e) => onPlayModeChange(e.target.value as PlayMode)}
                        >
                            <MenuItem value="continuous">{t('games.melodiq_notes.continuous_mode')}</MenuItem>
                            <MenuItem value="wait">{t('games.melodiq_notes.wait_mode')}</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ flex: { xs: 1, sm: 'none' }, minWidth: { xs: 120, sm: 140 } }}>
                        <InputLabel>{t('games.melodiq_notes.input_source')}</InputLabel>
                        <Select
                            value={inputSource}
                            label={t('games.melodiq_notes.input_source')}
                            onChange={(e) => onInputSourceChange(e.target.value as InputSource)}
                        >
                            <MenuItem value="midi">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PianoIcon sx={{ fontSize: 18 }} />
                                    <span>{t('games.melodiq_notes.midi_keyboard')}</span>
                                </Box>
                            </MenuItem>
                            <MenuItem value="mic">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <MicIcon sx={{ fontSize: 18 }} />
                                    <span>{t('games.melodiq_notes.microphone')}</span>
                                </Box>
                            </MenuItem>
                        </Select>
                    </FormControl>
                </Stack>

                {/* Right: Speed Slider */}
                {playMode === 'continuous' && (
                    <Box sx={{ width: { xs: '100%', md: 'auto' }, minWidth: { xs: '100%', md: 180 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <SpeedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                    {t('games.melodiq_notes.speed')}
                                </Typography>
                                <Typography variant="caption" fontWeight="bold">
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
                            />
                        </Box>
                    </Box>
                )}
            </Stack>
        </Paper>
    );
};

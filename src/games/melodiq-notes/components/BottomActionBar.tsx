import React from 'react';
import { Paper, Stack, Button, IconButton, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { useTranslation } from 'react-i18next';
import type { StemType, PlayMode } from '../types';
import { SpeedControl } from './SpeedControl';

interface BottomActionBarProps {
    isPlaying: boolean;
    playMode: PlayMode;
    speedPercent: number;
    effectiveBpm: number;
    mutedStems: Set<StemType>;
    stemsAvailable: boolean;
    onTogglePlay: () => void;
    onReset: () => void;
    onSpeedPercentChange: (speed: number) => void;
    onToggleMute: (type: StemType) => void;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({
    isPlaying,
    playMode,
    speedPercent,
    effectiveBpm,
    mutedStems,
    stemsAvailable,
    onTogglePlay,
    onReset,
    onSpeedPercentChange,
    onToggleMute
}) => {
    const { t } = useTranslation();

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                p: { xs: 1.5, sm: 2 },
                zIndex: 1100,
                background: 'rgba(20, 20, 30, 0.95)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2
            }}
        >
            <Stack direction="row" spacing={2} alignItems="center" flex={1} justifyContent={{ xs: 'center', sm: 'flex-start' }}>
                <Button
                    variant="contained"
                    color={isPlaying ? 'warning' : 'success'}
                    size="large"
                    startIcon={isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                    onClick={onTogglePlay}
                    sx={{ px: { xs: 3, sm: 4 }, py: 1.5, borderRadius: 3, fontWeight: 'bold' }}
                >
                    {isPlaying ? t('games.melodiq_notes.pause') : t('games.melodiq_notes.start_practice')}
                </Button>

                <Button
                    variant="outlined"
                    color="secondary"
                    size="large"
                    startIcon={<RestartAltIcon />}
                    onClick={onReset}
                    sx={{ borderRadius: 3, display: { xs: 'none', sm: 'flex' } }}
                >
                    {t('games.melodiq_notes.reset')}
                </Button>

                <IconButton
                    color="secondary"
                    onClick={onReset}
                    sx={{ display: { xs: 'flex', sm: 'none' } }}
                    title={t('games.melodiq_notes.reset')}
                >
                    <RestartAltIcon />
                </IconButton>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center" flex={1} justifyContent={{ xs: 'center', sm: 'center' }}>
                {playMode === 'continuous' && (
                    <SpeedControl
                        speedPercent={speedPercent}
                        effectiveBpm={effectiveBpm}
                        onSpeedPercentChange={onSpeedPercentChange}
                    />
                )}
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" flex={1} justifyContent={{ xs: 'center', sm: 'flex-end' }}>
                {stemsAvailable && (
                    <>
                        {(['drums', 'bass', 'instrument', 'vocals', 'other'] as StemType[]).map(stemType => (
                            <Tooltip key={stemType} title={`${mutedStems.has(stemType) ? 'Unmute' : 'Mute'} ${stemType}`}>
                                <IconButton
                                    onClick={() => onToggleMute(stemType)}
                                    color={mutedStems.has(stemType) ? 'error' : 'primary'}
                                    size="small"
                                    sx={{
                                        opacity: mutedStems.has(stemType) ? 0.6 : 1,
                                        bgcolor: mutedStems.has(stemType) ? 'rgba(244, 67, 54, 0.1)' : 'rgba(33, 150, 243, 0.1)'
                                    }}
                                >
                                    <GraphicEqIcon />
                                </IconButton>
                            </Tooltip>
                        ))}
                    </>
                )}
            </Stack>
        </Paper>
    );
};

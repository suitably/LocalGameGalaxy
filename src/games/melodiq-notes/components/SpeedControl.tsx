import React from 'react';
import { Box, Stack, Button, Typography } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import { useTranslation } from 'react-i18next';

interface SpeedControlProps {
    speedPercent: number;
    effectiveBpm: number;
    onSpeedPercentChange: (speed: number) => void;
}

const QUICK_SPEEDS = [50, 75, 100, 125];

export const SpeedControl: React.FC<SpeedControlProps> = ({
    speedPercent,
    effectiveBpm,
    onSpeedPercentChange,
}) => {
    const { t } = useTranslation();

    return (
        <Box sx={{ minWidth: 180, flex: '0 1 210px' }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                    <SpeedIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                        {t('games.melodiq_notes.speed')}
                    </Typography>
                </Stack>
                <Typography variant="caption" fontWeight="bold">
                    {speedPercent}% ({effectiveBpm} BPM)
                </Typography>
            </Stack>
            <input
                type="range"
                min="25"
                max="200"
                step="5"
                value={speedPercent}
                onChange={(e) => onSpeedPercentChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
            />
            <Stack direction="row" spacing={0.5} justifyContent="space-between" sx={{ mt: 0.5 }}>
                {QUICK_SPEEDS.map(pct => (
                    <Button
                        key={pct}
                        size="small"
                        variant={speedPercent === pct ? 'contained' : 'text'}
                        sx={{ minWidth: 36, px: 0.5, py: 0, fontSize: '0.7rem' }}
                        onClick={() => onSpeedPercentChange(pct)}
                    >
                        {pct}%
                    </Button>
                ))}
            </Stack>
        </Box>
    );
};

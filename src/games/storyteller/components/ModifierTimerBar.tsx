import React from 'react';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
import HourglassBottomRoundedIcon from '@mui/icons-material/HourglassBottomRounded';
import { useTranslation } from 'react-i18next';

interface ModifierTimerBarProps {
  timeLeft: number;
  percentRemaining: number;
  isExpiringSoon: boolean;
  isCritical: boolean;
}

export const ModifierTimerBar: React.FC<ModifierTimerBarProps> = ({
  timeLeft,
  percentRemaining,
  isExpiringSoon,
  isCritical,
}) => {
  const { t } = useTranslation();

  const color = isCritical ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#38bdf8';

  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 2,
        bgcolor: isCritical
          ? 'rgba(239, 68, 68, 0.15)'
          : isExpiringSoon
            ? 'rgba(245, 158, 11, 0.15)'
            : 'rgba(56, 189, 248, 0.1)',
        border: '1px solid',
        borderColor: isCritical
          ? 'rgba(239, 68, 68, 0.4)'
          : isExpiringSoon
            ? 'rgba(245, 158, 11, 0.4)'
            : 'rgba(56, 189, 248, 0.25)',
        transition: 'all 0.3s ease',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {isCritical ? (
            <HourglassBottomRoundedIcon
              sx={{
                color,
                fontSize: 20,
                animation: 'pulse 1s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.4 },
                },
              }}
            />
          ) : (
            <TimerRoundedIcon sx={{ color, fontSize: 20 }} />
          )}
          <Typography variant="caption" fontWeight={700} sx={{ color: '#f8fafc' }}>
            {t('storyteller.timeAttackTitle', 'Time Attack')}
          </Typography>
        </Stack>

        <Typography variant="caption" fontWeight={700} sx={{ color }}>
          {timeLeft}s {t('storyteller.secondsRemaining', 'verbleibend')}
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={percentRemaining}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: 'rgba(255, 255, 255, 0.1)',
          '& .MuiLinearProgress-bar': {
            bgcolor: color,
            borderRadius: 3,
            transition: 'transform 0.4s linear',
          },
        }}
      />
    </Box>
  );
};

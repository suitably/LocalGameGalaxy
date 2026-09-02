import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Chip, keyframes } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import { useTranslation } from 'react-i18next';

const rollAnimation = keyframes`
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(-15deg) scale(1.15); }
  50% { transform: rotate(20deg) scale(1.1); }
  75% { transform: rotate(-10deg) scale(1.05); }
  100% { transform: rotate(0deg) scale(1); }
`;

interface KnisterDiceRollerProps {
  currentRoll: { die1: number; die2: number; sum: number } | null;
  rollCount: number;
  rollHistory: { die1: number; die2: number; sum: number }[];
  onRoll: (d1: number, d2: number) => void;
  disabled?: boolean;
}

export const KnisterDiceRoller: React.FC<KnisterDiceRollerProps> = ({
  currentRoll,
  rollCount,
  rollHistory,
  onRoll,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [isRolling, setIsRolling] = useState(false);

  const handleRollClick = () => {
    if (disabled || isRolling || rollCount >= 25 || currentRoll !== null) return;
    setIsRolling(true);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }

    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      onRoll(d1, d2);
      setIsRolling(false);
    }, 400);
  };

  const renderDieFace = (val: number | undefined) => {
    return (
      <Paper
        elevation={4}
        sx={{
          width: { xs: 52, sm: 64 },
          height: { xs: 52, sm: 64 },
          borderRadius: 3,
          bgcolor: '#fff',
          color: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: { xs: '1.6rem', sm: '2rem' },
          boxShadow: '0 6px 16px rgba(0,0,0,0.35), inset 0 -3px 0 rgba(0,0,0,0.15)',
          animation: isRolling ? `${rollAnimation} 0.4s ease-in-out` : 'none',
        }}
      >
        {val || '?'}
      </Paper>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        width: '100%',
        maxWidth: 440,
      }}
    >
      {/* Dice visual + Sum Display */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {renderDieFace(currentRoll?.die1)}
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.secondary' }}>
          +
        </Typography>
        {renderDieFace(currentRoll?.die2)}

        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.secondary', mx: 0.5 }}>
          =
        </Typography>

        <Paper
          elevation={6}
          sx={{
            width: { xs: 60, sm: 76 },
            height: { xs: 60, sm: 76 },
            borderRadius: 3.5,
            bgcolor: currentRoll ? 'warning.main' : 'rgba(255,255,255,0.08)',
            color: currentRoll ? 'warning.contrastText' : 'text.disabled',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: currentRoll ? '0 0 24px rgba(255, 167, 38, 0.5)' : 'none',
            border: '2px solid',
            borderColor: currentRoll ? 'warning.light' : 'rgba(255,255,255,0.1)',
            transition: 'all 0.3s ease',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', lineHeight: 1 }}>
            {t('games.knister.sum', 'SUMME')}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '1.6rem', sm: '2.1rem' },
              lineHeight: 1.1,
            }}
          >
            {currentRoll ? currentRoll.sum : '-'}
          </Typography>
        </Paper>
      </Box>

      {/* Round Tracker & Roll Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
        <Chip
          label={`${t('games.knister.round', 'Wurf')}: ${rollCount}/25`}
          color={rollCount >= 25 ? 'error' : 'primary'}
          variant="outlined"
          sx={{ fontWeight: 800, px: 1, height: 42, borderRadius: 3 }}
        />

        <Button
          variant="contained"
          color="warning"
          size="large"
          fullWidth
          disabled={disabled || isRolling || rollCount >= 25 || currentRoll !== null}
          onClick={handleRollClick}
          startIcon={<CasinoIcon />}
          sx={{
            py: 1.2,
            fontWeight: 800,
            fontSize: { xs: '1rem', sm: '1.1rem' },
            borderRadius: 3,
            boxShadow: '0 4px 16px rgba(255, 167, 38, 0.3)',
          }}
        >
          {currentRoll !== null
            ? t('games.knister.place_number_prompt', 'Zahl im Raster eintragen!')
            : rollCount >= 25
            ? t('games.knister.game_over', 'Spiel beendet')
            : t('games.knister.roll_dice', 'Würfeln')}
        </Button>
      </Box>

      {/* Roll History */}
      {rollHistory.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, overflowX: 'auto', maxWidth: '100%', py: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, flexShrink: 0 }}>
            {t('games.knister.history', 'Verlauf')}:
          </Typography>
          {rollHistory.slice(0, 10).map((h, idx) => (
            <Chip
              key={`hist-${idx}`}
              label={`${h.sum}`}
              size="small"
              variant={idx === 0 && currentRoll ? 'filled' : 'outlined'}
              color={idx === 0 && currentRoll ? 'warning' : 'default'}
              sx={{ fontWeight: 700, fontSize: '0.75rem', minWidth: 28 }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

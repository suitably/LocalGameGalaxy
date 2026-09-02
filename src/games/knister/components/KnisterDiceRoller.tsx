import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, Button, Chip } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import { useTranslation } from 'react-i18next';

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
  const [animating, setAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleRollClick = () => {
    if (disabled || animating || rollCount >= 25 || currentRoll !== null) return;

    setAnimating(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      setAnimating(false);
      onRoll(d1, d2);
      timeoutRef.current = null;
    }, 350);
  };

  const renderDie = (key: string, val: number | undefined) => {
    return (
      <Paper
        key={key}
        elevation={animating ? 8 : 4}
        sx={{
          width: { xs: 44, sm: 52 },
          height: { xs: 44, sm: 52 },
          borderRadius: 2.5,
          bgcolor: '#ffffff',
          color: '#212121',
          border: '2px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: { xs: '1.3rem', sm: '1.6rem' },
          fontWeight: '900',
          boxShadow: 3,
          transform: animating ? 'rotate(-6deg) scale(1.08)' : 'none',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      >
        {val || '?'}
      </Paper>
    );
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        bgcolor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
        mb: 2,
        width: '100%',
        maxWidth: 520,
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        {/* Dice Row + Sum Info */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1, p: 0.5, bgcolor: 'rgba(255, 255, 255, 0.08)', borderRadius: 2 }}>
            {renderDie('d1', currentRoll?.die1)}
            {renderDie('d2', currentRoll?.die2)}
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.secondary', px: 0.5 }}>
            =
          </Typography>

          <Box sx={{ textAlign: 'center', minWidth: 44 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>
              {t('games.knister.sum', 'SUMME')}
            </Typography>
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{
                color: currentRoll ? 'warning.main' : 'text.disabled',
                fontSize: { xs: '1.3rem', sm: '1.6rem' },
                lineHeight: 1.1,
              }}
            >
              {currentRoll ? currentRoll.sum : '-'}
            </Typography>
          </Box>
        </Box>

        {/* Round Tracker & Roll Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
          <Chip
            label={`${t('games.knister.round', 'Wurf')}: ${rollCount}/25`}
            color={rollCount >= 25 ? 'error' : 'default'}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 800 }}
          />

          <Button
            variant="contained"
            color="primary"
            startIcon={<CasinoIcon />}
            onClick={handleRollClick}
            disabled={disabled || animating || rollCount >= 25 || currentRoll !== null}
            sx={{
              fontWeight: 'bold',
              px: { xs: 2, sm: 3 },
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            {animating
              ? t('games.knister.rolling', 'Würfeln...')
              : currentRoll !== null
              ? t('games.knister.place_number_prompt', 'Eintragen!')
              : rollCount >= 25
              ? t('games.knister.game_over', 'Beendet')
              : t('games.knister.roll_dice', 'Würfeln')}
          </Button>
        </Box>
      </Box>

      {/* Roll History */}
      {rollHistory.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, overflowX: 'auto', maxWidth: '100%', mt: 1.5, pt: 1, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, flexShrink: 0, fontWeight: 700 }}>
            {t('games.knister.history', 'Verlauf')}:
          </Typography>
          {rollHistory.slice(0, 10).map((h, idx) => (
            <Chip
              key={`hist-${idx}`}
              label={`${h.sum}`}
              size="small"
              variant={idx === 0 && currentRoll ? 'filled' : 'outlined'}
              color={idx === 0 && currentRoll ? 'warning' : 'default'}
              sx={{ fontWeight: 700, fontSize: '0.75rem', minWidth: 28, height: 22 }}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Button } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import { useTranslation } from 'react-i18next';
import { Die3D } from '../../../components/games/Die3D';

interface KniffelDiceRollerProps {
  dice: number[];
  heldDice: boolean[];
  rollCount: number;
  onRoll: (newDice: number[]) => void;
  onToggleHold: (index: number) => void;
  disabled?: boolean;
}

export const KniffelDiceRoller: React.FC<KniffelDiceRollerProps> = ({
  dice,
  heldDice,
  rollCount,
  onRoll,
  onToggleHold,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [animating, setAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleRollClick = () => {
    if (disabled || animating || rollCount >= 3) return;

    setAnimating(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      const newDice = dice.map((d, i) => {
        if (heldDice[i]) return d; // Keep held dice
        return Math.floor(Math.random() * 6) + 1; // Roll unheld
      });
      setAnimating(false);
      onRoll(newDice);
      timeoutRef.current = null;
    }, 350);
  };

  const isRollDisabled = disabled || animating || rollCount >= 3;

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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
        {dice.map((val, i) => (
          <Die3D
            key={i}
            value={val}
            color={heldDice[i] ? 'red' : 'white'}
            isRolling={animating && !heldDice[i]}
            isSelected={heldDice[i]}
            onClick={() => {
              if (!animating && rollCount > 0 && rollCount < 3) {
                onToggleHold(i);
              }
            }}
            disabled={animating || rollCount === 0 || rollCount >= 3}
          />
        ))}
      </Box>
      <Button
        variant="contained"
        color="primary"
        startIcon={<CasinoIcon />}
        onClick={handleRollClick}
        disabled={isRollDisabled}
        sx={{ fontWeight: 'bold', px: { xs: 2, sm: 3 }, py: 1, borderRadius: 2 }}
      >
        {animating
          ? t('games.kniffel.rolling', 'Würfelt...')
          : `${t('games.kniffel.roll', 'Würfeln')} (${rollCount}/3)`}
      </Button>
    </Paper>
  );
};

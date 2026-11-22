import React, { useState, useEffect, useRef } from 'react';
import { alpha, Box, Paper, Button } from '@mui/material';
import CasinoIcon from '@mui/icons-material/CasinoRounded';
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
  const rollLabel = `${t('games.kniffel.roll')} (${rollCount}/3)`;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1, sm: 2 },
        borderRadius: 3,
        // Opaque fill (tint drawn as an image on top) so the sticky panel hides the rows below.
        bgcolor: 'background.default',
        backgroundImage: (theme) =>
          `linear-gradient(${alpha(theme.palette.text.primary, 0.05)}, ${alpha(theme.palette.text.primary, 0.05)})`,
        border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
        mb: { xs: 1, sm: 2 },
        display: 'flex',
        // Phones: dice and roll button share one line, and the panel sticks to the top
        // so the dice stay visible while scrolling down the score sheet.
        flexDirection: { xs: 'row', sm: 'column' },
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: { xs: 1, sm: 2 },
        position: { xs: 'sticky', sm: 'static' },
        top: 0,
        zIndex: 3,
        touchAction: 'manipulation',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 0.75, sm: 1 },
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
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
        aria-label={rollLabel}
        sx={{ fontWeight: 'bold', px: { xs: 1.5, sm: 3 }, py: 1, minHeight: 48, borderRadius: 2 }}
      >
        {animating ? (
          t('games.kniffel.rolling')
        ) : (
          <>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, mr: 0.5 }}>
              {t('games.kniffel.roll')}
            </Box>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              ({rollCount}/3)
            </Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              {rollCount}/3
            </Box>
          </>
        )}
      </Button>
    </Paper>
  );
};

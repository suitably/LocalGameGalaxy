import React from 'react';
import { alpha, Box, Paper, Typography, Button } from '@mui/material';
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import { useTranslation } from 'react-i18next';
import { Die3D, PRESET_DIE_COLORS } from '../../../components/games/Die3D';
import { useDiceRollAnimation } from '../../../components/games/useDiceRollAnimation';
import type { DiceValues, RowColor } from '../logic/types';
import type { DieKey } from '../logic/diceHighlight';

interface QwixxDiceRollerProps {
  dice: DiceValues;
  isRolling: boolean;
  onRoll: (dice: DiceValues) => void;
  onDieClick?: (dieKey: DieKey) => void;
  selectedDie?: DieKey | null;
  disabled?: boolean;
  maxDieValue?: number;
  /** Colored dice out of play because their row is locked; not rendered. */
  removedDice?: RowColor[];
}

const DIE_COLORS = {
  white1: PRESET_DIE_COLORS.white,
  white2: PRESET_DIE_COLORS.white,
  red: PRESET_DIE_COLORS.red,
  yellow: PRESET_DIE_COLORS.yellow,
  green: PRESET_DIE_COLORS.green,
  blue: PRESET_DIE_COLORS.blue,
};

const COLORED_DICE: RowColor[] = ['red', 'yellow', 'green', 'blue'];

export const QwixxDiceRoller: React.FC<QwixxDiceRollerProps> = ({
  dice,
  isRolling,
  onRoll,
  onDieClick,
  selectedDie = null,
  disabled = false,
  maxDieValue = 6,
  removedDice = [],
}) => {
  const { t } = useTranslation();
  const { animating, startRoll } = useDiceRollAnimation();

  const handleRollClick = () => {
    if (disabled || isRolling || animating) return;
    startRoll(() => {
      const limit = maxDieValue || 6;
      const roll = () => Math.floor(Math.random() * limit) + 1;
      onRoll({
        white1: roll(),
        white2: roll(),
        red: roll(),
        yellow: roll(),
        green: roll(),
        blue: roll(),
      });
    });
  };

  const whiteSum = dice.white1 + dice.white2;

  const renderDie = (key: keyof DiceValues, val: number) => {
    const c = DIE_COLORS[key];
    const isSelected = selectedDie === key;
    const isClickable = !animating && !isRolling && !!onDieClick;
    return (
      <Die3D
        key={key}
        value={val}
        color={c}
        isRolling={animating}
        isSelected={isSelected}
        onClick={isClickable ? () => onDieClick(key) : undefined}
        sx={{
          width: { xs: 30, sm: 52 },
          height: { xs: 30, sm: 52 },
          fontSize: { xs: '1rem', sm: '1.6rem' },
          borderRadius: 2,
        }}
      />
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1, sm: 2 },
        borderRadius: 3,
        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
        border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
        mb: { xs: 1, sm: 2 },
        touchAction: 'manipulation',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: { xs: 1, sm: 2 },
        }}
      >
        {/* Dice Row (phones: dice, white sum and an icon-only roll button share one line) */}
        <Box
          sx={{
            display: 'flex',
            gap: { xs: 0.5, sm: 1.5 },
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 0.5, sm: 1 },
              p: 0.5,
              alignItems: 'center',
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
              borderRadius: 2,
            }}
          >
            {renderDie('white1', dice.white1)}
            {renderDie('white2', dice.white2)}
            <Typography
              aria-label={t('games.qwixx.white_sum', 'White Sum (All)')}
              fontWeight="bold"
              color="primary"
              sx={{
                display: { xs: 'block', sm: 'none' },
                px: 0.25,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              ={whiteSum}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 } }}>
            {COLORED_DICE.filter((key) => !removedDice.includes(key)).map((key) =>
              renderDie(key, dice[key]),
            )}
          </Box>
        </Box>

        {/* Roll Button & White Sum Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, ml: 'auto' }}>
          <Box
            sx={{
              textAlign: 'right',
              display: { xs: 'none', sm: 'flex' },
              flexDirection: { xs: 'row', sm: 'column' },
              alignItems: { xs: 'baseline', sm: 'flex-end' },
              gap: { xs: 1, sm: 0 },
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block">
              {t('games.qwixx.white_sum', 'White Sum (All)')}
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="primary" sx={{ lineHeight: 1.2 }}>
              {whiteSum}
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={<CasinoIcon />}
            aria-label={t('games.qwixx.roll', 'Roll')}
            onClick={handleRollClick}
            disabled={disabled || isRolling || animating}
            sx={{
              fontWeight: 'bold',
              px: { xs: 1, sm: 3 },
              py: { xs: 0.75, sm: 1 },
              minWidth: 48,
              minHeight: 48,
              borderRadius: 2,
              '& .MuiButton-startIcon': { mx: { xs: 0 }, ml: { sm: -0.5 }, mr: { sm: 1 } },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {animating ? t('games.qwixx.rolling', 'Rolling...') : t('games.qwixx.roll', 'Roll')}
            </Box>
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

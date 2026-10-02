import { Box, Button, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDartsGame, type ThrowMultiplier, type ThrowValue } from '../useDartsGame';
import BackspaceIcon from '@mui/icons-material/Backspace';

type DartsGameState = ReturnType<typeof useDartsGame>;

interface Props {
  state: DartsGameState;
}

export function DartsInput({ state }: Props) {
  const { t } = useTranslation();
  const { addThrow, undoThrow, winner } = state;
  const [multiplier, setMultiplier] = useState<ThrowMultiplier>(1);

  const handleNumberClick = (value: ThrowValue) => {
    if (winner) return;

    let finalValue = value;
    let finalMultiplier = multiplier;
    let score = 0;

    if (value === 0) {
      // Miss
      finalMultiplier = 1;
      score = 0;
    } else if (value === 25 && multiplier === 2) {
      // Bullseye (Double Bull)
      finalValue = 50 as unknown as ThrowValue;
      finalMultiplier = 2; // Treat bullseye as double for checkout rules
      score = 50;
    } else if (value === 25) {
      // Bull (Single Bull)
      finalMultiplier = 1;
      score = 25;
    } else {
      score = value * multiplier;
    }

    addThrow({
      value: finalValue,
      multiplier: finalMultiplier,
      score: score,
    });

    // Reset multiplier after throw
    setMultiplier(1);
  };

  const handleMultiplierChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMultiplier: ThrowMultiplier | null,
  ) => {
    if (newMultiplier !== null) {
      setMultiplier(newMultiplier);
    }
  };

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, gap: 1 }}>
        <ToggleButtonGroup
          value={multiplier}
          exclusive
          onChange={handleMultiplierChange}
          aria-label="throw multiplier"
          sx={{ flexGrow: 1 }}
          color="primary"
          disabled={!!winner}
        >
          <ToggleButton value={1} aria-label="single" sx={{ flex: 1, py: 1.5, fontWeight: 'bold' }}>
            {t('games.darts.single')}
          </ToggleButton>
          <ToggleButton value={2} aria-label="double" sx={{ flex: 1, py: 1.5, fontWeight: 'bold' }}>
            {t('games.darts.double')}
          </ToggleButton>
          <ToggleButton value={3} aria-label="triple" sx={{ flex: 1, py: 1.5, fontWeight: 'bold' }}>
            {t('games.darts.triple')}
          </ToggleButton>
        </ToggleButtonGroup>

        <Button
          variant="outlined"
          color="error"
          onClick={undoThrow}
          disabled={state.turns.length === 0 && state.currentTurnThrows.length === 0}
          sx={{ px: 3 }}
        >
          <BackspaceIcon />
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: -0.5 }}>
        {/* 1 to 20 */}
        {numbers.map((num) => (
          <Box sx={{ width: { xs: '25%', sm: '16.66%' }, p: 0.5 }} key={num}>
            <Button
              fullWidth
              variant="contained"
              color="inherit"
              onClick={() => handleNumberClick(num as unknown as ThrowValue)}
              sx={{
                height: 48,
                fontSize: '1.25rem',
                fontWeight: 'bold',
                bgcolor: 'background.paper',
                color: 'text.primary',
                border: 1,
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              disabled={!!winner}
            >
              {num}
            </Button>
          </Box>
        ))}

        {/* Special Buttons */}
        <Box sx={{ width: { xs: '50%', sm: '33.33%' }, p: 0.5 }}>
          <Button
            fullWidth
            variant="contained"
            color="success"
            onClick={() => handleNumberClick(25)}
            sx={{ height: 48, fontWeight: 'bold' }}
            disabled={!!winner || multiplier === 3} // No triple bull
          >
            {multiplier === 2 ? 'BULLSEYE (50)' : 'BULL (25)'}
          </Button>
        </Box>
        <Box sx={{ width: { xs: '50%', sm: '33.33%' }, p: 0.5 }}>
          <Button
            fullWidth
            variant="contained"
            color="error"
            onClick={() => handleNumberClick(0)}
            sx={{ height: 48, fontWeight: 'bold' }}
            disabled={!!winner}
          >
            {t('games.darts.miss')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

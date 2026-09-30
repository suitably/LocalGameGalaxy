import React from 'react';
import { Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { KniffelCategory } from '../logic/types';

interface KniffelScoreInputProps {
  category: KniffelCategory;
  showDice: boolean;
  calculatedScore: number;
  onConfirm: (score: number) => void;
  onCancel: () => void;
}

export const KniffelScoreInput: React.FC<KniffelScoreInputProps> = ({
  category,
  showDice,
  calculatedScore,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();

  const renderManualOptions = () => {
    switch (category) {
      case 'ones':
      case 'twos':
      case 'threes':
      case 'fours':
      case 'fives':
      case 'sixes': {
        const faceMap: Record<string, number> = {
          ones: 1, twos: 2, threes: 3, fours: 4, fives: 5, sixes: 6,
        };
        const face = faceMap[category];
        return [0, 1, 2, 3, 4, 5].map((multiplier) => (
          <Button key={multiplier} variant="outlined" onClick={() => onConfirm(multiplier * face)}>
            {multiplier * face}
          </Button>
        ));
      }
      case 'three_of_a_kind':
      case 'four_of_a_kind':
      case 'chance':
        // Not practical to show 30 buttons. Let's provide a number input or a grid of numbers 5..30
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, maxHeight: 200, overflowY: 'auto' }}>
            {Array.from({ length: 26 }, (_, i) => i + 5).map((score) => (
              <Button key={score} variant="outlined" onClick={() => onConfirm(score)} sx={{ minWidth: 0, p: 0.5 }}>
                {score}
              </Button>
            ))}
            <Button variant="outlined" color="error" onClick={() => onConfirm(0)} sx={{ gridColumn: 'span 5' }}>
              0
            </Button>
          </Box>
        );
      case 'full_house':
        return [
          <Button key="25" variant="contained" onClick={() => onConfirm(25)}>25</Button>,
          <Button key="0" variant="outlined" color="error" onClick={() => onConfirm(0)}>0</Button>,
        ];
      case 'small_straight':
        return [
          <Button key="30" variant="contained" onClick={() => onConfirm(30)}>30</Button>,
          <Button key="0" variant="outlined" color="error" onClick={() => onConfirm(0)}>0</Button>,
        ];
      case 'large_straight':
        return [
          <Button key="40" variant="contained" onClick={() => onConfirm(40)}>40</Button>,
          <Button key="0" variant="outlined" color="error" onClick={() => onConfirm(0)}>0</Button>,
        ];
      case 'kniffel':
        return [
          <Button key="50" variant="contained" onClick={() => onConfirm(50)}>50</Button>,
          <Button key="0" variant="outlined" color="error" onClick={() => onConfirm(0)}>0</Button>,
        ];
      case 'kniffel_bonus':
        return [
          <Button key="50" variant="contained" onClick={() => onConfirm(50)}>50</Button>,
        ];
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {showDice ? (
        <>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => onConfirm(calculatedScore)}
          >
            {calculatedScore} {t('games.kniffel.points', 'Punkte eintragen')}
          </Button>
          <Button variant="outlined" color="error" onClick={() => onConfirm(0)}>
            {t('games.kniffel.strike', 'Streichen (0)')}
          </Button>
        </>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
           {renderManualOptions()}
        </Box>
      )}
      <Button variant="text" onClick={onCancel} sx={{ mt: 1 }}>
        {t('common.cancel', 'Abbrechen')}
      </Button>
    </Box>
  );
};

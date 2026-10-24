import React from 'react';
import { Dialog, DialogContent, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { KniffelCategory, KniffelPlayer } from '../logic/types';
import type { SelectedCell } from './useKniffelBoardState';
import { KniffelScoreInput } from './KniffelScoreInput';

interface Props {
  cell: SelectedCell | null;
  players: KniffelPlayer[];
  showDice: boolean;
  possibleScores: Record<KniffelCategory, number>;
  onConfirm: (score: number) => void;
  onClose: () => void;
}

export const KniffelScoreModal: React.FC<Props> = ({
  cell,
  players,
  showDice,
  possibleScores,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog open={!!cell} onClose={onClose} maxWidth="xs" fullWidth>
      {cell && (
        <DialogContent sx={{ p: 4 }}>
          <Typography variant="h6" mb={2}>
            {t(`games.kniffel.cat.${cell.category}`, cell.category)}
          </Typography>
          <Typography variant="body2" mb={3} color="text.secondary">
            {players[cell.playerIdx].name}
          </Typography>
          <KniffelScoreInput
            category={cell.category}
            showDice={showDice}
            calculatedScore={possibleScores[cell.category]}
            onConfirm={onConfirm}
            onCancel={onClose}
          />
        </DialogContent>
      )}
    </Dialog>
  );
};

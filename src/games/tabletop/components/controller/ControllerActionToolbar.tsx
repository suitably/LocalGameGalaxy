import React from 'react';
import { Box, Button, Typography, IconButton, Paper } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import StyleIcon from '@mui/icons-material/Style';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from 'react-i18next';
import type { DeckWidget, DieWidget, CounterWidget } from '../../logic/types';

interface ControllerActionToolbarProps {
  decks: DeckWidget[];
  dice: DieWidget[];
  counters: CounterWidget[];
  onDrawCard: (deckId: string) => void;
  onRollDice: (dieIds: string[]) => void;
  onUpdateCounter: (counterId: string, delta: number) => void;
}

export const ControllerActionToolbar: React.FC<ControllerActionToolbarProps> = ({
  decks,
  dice,
  counters,
  onDrawCard,
  onRollDice,
  onUpdateCounter,
}) => {
  const { t } = useTranslation();

  return (
    <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center" justifyContent="center" p={1.5}>
      {/* Decks Draw Buttons */}
      {decks.map((deck) => (
        <Button
          key={deck.id}
          variant="outlined"
          size="medium"
          startIcon={<StyleIcon />}
          onClick={() => onDrawCard(deck.id)}
          disabled={deck.cardIds.length === 0}
          sx={{ borderRadius: 3, fontWeight: 700 }}
        >
          {deck.label || t('games.tabletop.draw', 'Ziehen')} ({deck.cardIds.length})
        </Button>
      ))}

      {/* Dice Roll Button */}
      {dice.length > 0 && (
        <Button
          variant="contained"
          color="secondary"
          size="medium"
          startIcon={<CasinoIcon />}
          onClick={() => onRollDice(dice.map((d) => d.id))}
          sx={{ borderRadius: 3, fontWeight: 700 }}
        >
          {t('games.tabletop.roll_dice', 'Würfeln')} ({dice.length})
        </Button>
      )}

      {/* Counters */}
      {counters.map((c) => (
        <Paper
          key={c.id}
          variant="outlined"
          sx={{
            display: 'flex',
            alignItems: 'center',
            borderRadius: 3,
            px: 1,
            py: 0.5,
            gap: 1,
          }}
        >
          <IconButton size="small" onClick={() => onUpdateCounter(c.id, -(c.step || 1))}>
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Box textAlign="center">
            <Typography variant="body2" fontWeight={800}>{c.value}</Typography>
            {c.label && <Typography variant="caption" color="text.secondary">{c.label}</Typography>}
          </Box>
          <IconButton size="small" onClick={() => onUpdateCounter(c.id, c.step || 1)}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Paper>
      ))}
    </Box>
  );
};

import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FlashOnRoundedIcon from '@mui/icons-material/FlashOnRounded';
import { useTranslation } from 'react-i18next';
import type { SchwimmenHistoryEntry } from '../hooks/useSchwimmenState';
import type { CardPlayer } from '../logic/types';
import { CardScoreHistoryDialog } from './common/CardScoreHistoryDialog';

interface SchwimmenBlitzDialogProps {
  player: CardPlayer | null;
  onCancel: () => void;
  onConfirm: (player: CardPlayer) => void;
}

export const SchwimmenBlitzDialog: React.FC<SchwimmenBlitzDialogProps> = ({
  player,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const { piece } = useTheme().palette;

  return (
    <Dialog open={Boolean(player)} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FlashOnRoundedIcon sx={{ color: piece.yellow }} />
        {t('games.cards.schwimmen.blitz_dialog_title', 'Blitz / Feuer!')}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mt: 1 }}>
          <strong>{player?.name}</strong>{' '}
          {t(
            'games.cards.schwimmen.blitz_dialog_desc',
            'hat 31 / Blitz! Alle anderen aktiven Spieler verlieren sofort 1 Leben.',
          )}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onCancel} sx={{ color: 'text.secondary' }}>
          {t('common.cancel', 'Abbrechen')}
        </Button>
        <Button
          variant="contained"
          onClick={() => player && onConfirm(player)}
          sx={{
            bgcolor: piece.yellow,
            color: piece.contrastText,
            fontWeight: 800,
            '&:hover': { bgcolor: piece.yellow, filter: 'brightness(0.92)' },
          }}
        >
          {t('games.cards.schwimmen.confirm_blitz', 'Blitz ausführen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface SchwimmenHistoryDialogProps {
  open: boolean;
  entries: SchwimmenHistoryEntry[];
  onClose: () => void;
}

export const SchwimmenHistoryDialog: React.FC<SchwimmenHistoryDialogProps> = ({
  open,
  entries,
  onClose,
}) => {
  const { t } = useTranslation();
  const { piece } = useTheme().palette;

  return (
    <CardScoreHistoryDialog
      open={open}
      title={t('games.cards.round_history', 'Rundenhistorie')}
      maxWidth="xs"
      onClose={onClose}
    >
      <Box sx={{ p: 2 }}>
        {entries.map((rh) => (
          <Box key={rh.round} sx={{ mb: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800, color: rh.isBlitz ? piece.yellow : piece.teal }}
            >
              {t('games.cards.round', 'Runde')} {rh.round}
            </Typography>
            <Typography variant="body2">{rh.description}</Typography>
          </Box>
        ))}
      </Box>
    </CardScoreHistoryDialog>
  );
};

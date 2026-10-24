import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { useTranslation } from 'react-i18next';
import { RoundHistoryItem } from './RoundHistoryItem';
import { getRoundDrawerName, getRoundGuesserName, useRoundHistory } from './useRoundHistory';
import type { PlayerIdentity } from '../logic/types';

interface RoundHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: string | null;
  players?: PlayerIdentity[];
}

export const RoundHistoryDialog: React.FC<RoundHistoryDialogProps> = ({
  open,
  onClose,
  gameId,
  players = [],
}) => {
  const { t } = useTranslation();
  const history = useRoundHistory(open, gameId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
      }}
    >
      <DialogTitle
        sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Box display="flex" alignItems="center" gap={1.2}>
          <HistoryRoundedIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={800} component="div">
              {t('guessart.historyTitle', 'Runden-Historie')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('guessart.historySubtitle', 'Vergangene Zeichnungen & Runden dieses Spiels')}
            </Typography>
          </Box>
        </Box>
        <IconButton aria-label={t('common.close', 'Schließen')} onClick={onClose} size="small">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 }, overflowY: 'auto' }}>
        {history.loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={6}>
            <CircularProgress />
          </Box>
        ) : history.rounds.length === 0 ? (
          <Box textAlign="center" py={6}>
            <Typography color="text.secondary">
              {t('guessart.noRoundsYet', 'Noch keine Runden gespielt.')}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {history.rounds.map((round) => (
              <RoundHistoryItem
                key={round.id}
                round={round}
                drawer={getRoundDrawerName(round, players)}
                guesser={getRoundGuesserName(round, players)}
                isExpanded={history.expandedRoundId === round.id}
                isReplaying={history.replayingRoundId === round.id}
                addedSynonyms={history.addedSynonyms}
                onToggle={(expanded) => history.toggleRound(round.id, expanded)}
                onToggleReplay={() => history.toggleReplay(round.id)}
                onAddSynonym={history.addSynonym}
              />
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" color="primary">
          {t('common.close', 'Schließen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

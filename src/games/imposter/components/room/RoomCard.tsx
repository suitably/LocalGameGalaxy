/**
 * The player's secret card in a party room: word, or "imposter" with the hint [ID: COMP-IMPOSTER-ROOM-CARD]
 *
 * Hidden until tapped so a neighbour cannot read it over the shoulder; after "understood" it can be
 * shown again any time during the round.
 */
import React, { useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';
import { useTranslation } from 'react-i18next';
import type { ImposterRoomView } from '../../logic/imposterRoom';

export const RoomCard: React.FC<{
  me: NonNullable<ImposterRoomView['me']>;
  onSeen?: () => void;
}> = ({ me, onSeen }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: 'center', mb: 3 }}>
      {open ? (
        <Box
          sx={{
            p: 3,
            mb: 2,
            borderRadius: 2,
            bgcolor: me.imposter ? 'error.main' : 'success.main',
            color: me.imposter ? 'error.contrastText' : 'success.contrastText',
          }}
        >
          {me.imposter ? (
            <>
              <Typography variant="h5" fontWeight={800}>
                {t('games.imposter.handover.you_are_imposter')}
              </Typography>
              <Typography sx={{ mt: 1 }}>
                {t('games.imposter.handover.imposter_hint', { hint: me.clue })}
              </Typography>
            </>
          ) : (
            <>
              <Typography>{t('games.imposter.handover.your_word')}</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
                {me.clue}
              </Typography>
            </>
          )}
        </Box>
      ) : (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t('games.imposter.room.card_hidden')}
        </Typography>
      )}
      <Box display="flex" gap={1} justifyContent="center" flexWrap="wrap">
        <Button
          variant={open ? 'outlined' : 'contained'}
          startIcon={open ? <VisibilityOffIcon /> : <VisibilityIcon />}
          onClick={() => setOpen((v) => !v)}
          sx={{ minHeight: 48 }}
        >
          {open ? t('games.imposter.room.hide_card') : t('games.imposter.room.show_card')}
        </Button>
        {onSeen && open && !me.seen && (
          <Button variant="contained" onClick={onSeen} sx={{ minHeight: 48 }}>
            {t('games.imposter.handover.understood')}
          </Button>
        )}
      </Box>
    </Paper>
  );
};

/**
 * The end of a party-room round: who was kicked, who the imposters were, the word [ID: COMP-IMPOSTER-ROOM-RESULT]
 */
import React from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import ReplayIcon from '@mui/icons-material/ReplayRounded';
import { useTranslation } from 'react-i18next';
import type { ImposterRoomView } from '../../logic/imposterRoom';

export const RoomResult: React.FC<{
  view: ImposterRoomView;
  result: NonNullable<ImposterRoomView['result']>;
  onNewRound?: () => void;
}> = ({ view, result, onNewRound }) => {
  const { t } = useTranslation();
  const nameOf = (id: string | null) => view.players.find((p) => p.id === id)?.name ?? '';
  const kickedRole = result.kicked && result.imposterIds.includes(result.kicked);
  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        {result.winner === 'NORMAL'
          ? t('games.imposter.result.innocents_win')
          : t('games.imposter.result.imposters_win')}
      </Typography>
      <Typography sx={{ mb: 2 }}>
        {result.kicked
          ? t('games.imposter.result.revealed_role', {
              name: nameOf(result.kicked),
              role: kickedRole
                ? t('games.imposter.result.imposter')
                : t('games.imposter.result.normal'),
            })
          : t('games.imposter.room.tie')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {t('games.imposter.room.word_was', { word: result.word, hint: result.hint })}
      </Typography>
      <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center" sx={{ mb: 2 }}>
        {view.players.map((p) => (
          <Chip
            key={p.id}
            label={`${p.name} · ${t('games.imposter.room.votes', { count: result.tally[p.id] ?? 0 })}`}
            color={result.imposterIds.includes(p.id) ? 'error' : 'default'}
            variant={result.imposterIds.includes(p.id) ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>
      {onNewRound && (
        <Box>
          <Button
            variant="contained"
            startIcon={<ReplayIcon />}
            onClick={onNewRound}
            sx={{ minHeight: 48 }}
          >
            {t('games.imposter.room.new_round')}
          </Button>
        </Box>
      )}
    </Paper>
  );
};

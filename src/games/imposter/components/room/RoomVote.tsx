/**
 * Voting in a party room: everyone picks one other player [ID: COMP-IMPOSTER-ROOM-VOTE]
 */
import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ImposterRoomView } from '../../logic/imposterRoom';

export const RoomVote: React.FC<{
  view: ImposterRoomView;
  onVote: (target: string) => void;
}> = ({ view, onVote }) => {
  const { t } = useTranslation();
  const me = view.me;
  const progress = { count: view.votedCount, total: view.players.length };
  if (!me || me.vote)
    return (
      <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>
        {t('games.imposter.room.voted_waiting', progress)}
      </Typography>
    );
  return (
    <Stack gap={1.5}>
      <Typography variant="h6" textAlign="center">
        {t('games.imposter.game.kick_title')}
      </Typography>
      {view.players
        .filter((p) => p.id !== me.id)
        .map((p) => (
          <Button
            key={p.id}
            variant="outlined"
            size="large"
            onClick={() => onVote(p.id)}
            sx={{ minHeight: 52, fontWeight: 700 }}
          >
            {p.name}
          </Button>
        ))}
    </Stack>
  );
};

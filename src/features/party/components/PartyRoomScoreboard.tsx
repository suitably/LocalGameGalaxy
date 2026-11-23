/**
 * Shared pieces of dice games in a party room [ID: PARTY-ROOM-SCOREBOARD]
 *
 * `PartyRoomConnecting` while the host's state is on its way; `PartyRoomScoreboard` is the
 * shared scoreboard every device shows (own entry filled, players still to act highlighted).
 */
import React from 'react';
import { Chip, CircularProgress, Stack, Typography } from '@mui/material';

export const PartyRoomConnecting: React.FC<{ label: string }> = ({ label }) => (
  <Stack alignItems="center" gap={2} py={6}>
    <CircularProgress />
    <Typography color="text.secondary">{label}</Typography>
  </Stack>
);

export interface ScoreboardEntry {
  id: string;
  name: string;
  score: number;
  /** Still has to act (place the roll, finish the turn, …). */
  pending?: boolean;
}

export const PartyRoomScoreboard: React.FC<{ entries: ScoreboardEntry[]; myId?: string }> = ({
  entries,
  myId,
}) => (
  <Stack direction="row" gap={0.75} flexWrap="wrap" justifyContent="center" mb={1}>
    {entries.map((e) => (
      <Chip
        key={e.id}
        variant={e.id === myId ? 'filled' : 'outlined'}
        color={e.pending ? 'warning' : 'default'}
        label={`${e.name} · ${e.score}`}
        sx={{ fontWeight: 700 }}
      />
    ))}
  </Stack>
);

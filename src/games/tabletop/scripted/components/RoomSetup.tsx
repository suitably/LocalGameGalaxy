/**
 * Before a scripted card game starts in a party room [ID: COMP-TABLETOP-SCRIPT-ROOM-SETUP]
 *
 * The host decides whether its device plays or only shows the table (for the TV) and starts
 * once the number of players fits; everyone else waits.
 */
import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import { useTranslation } from 'react-i18next';
import type { RoomPlayer } from '../../../../features/party/hooks/usePartyRoomPlayers';
import type { AnyGameScript } from '../logic/scriptTypes';
import { seatPlayers, type SessionPlayer } from '../logic/session';

interface RoomSetupProps {
  script: AnyGameScript;
  roster: RoomPlayer[];
  isHost: boolean;
  onStart: (players: SessionPlayer[]) => void;
}

export const RoomSetup: React.FC<RoomSetupProps> = ({ script, roster, isHost, onStart }) => {
  const { t } = useTranslation();
  const guests = roster.filter((p) => !p.isHost);
  // Enough players without the host: its screen is the table by default.
  const [choice, setChoice] = useState<boolean | null>(null);
  const tableOnly = choice ?? guests.length >= script.minPlayers;
  const candidates = (tableOnly ? guests : roster).map(({ id, name }) => ({ id, name }));
  const players = seatPlayers(script.id, candidates);

  if (!isHost) {
    return (
      <Stack alignItems="center" gap={2} py={6} px={2}>
        <CircularProgress />
        <Typography color="text.secondary" textAlign="center">
          {t('games.tabletop.scripted.setup.waitingForHost')}
        </Typography>
      </Stack>
    );
  }
  return (
    <Box sx={{ width: '100%', maxWidth: 560, mx: 'auto', p: 2, overflowY: 'auto' }}>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        {t('games.tabletop.scripted.setup.title')}
      </Typography>
      <FormControlLabel
        control={<Switch checked={tableOnly} onChange={(e) => setChoice(e.target.checked)} />}
        label={t('games.tabletop.scripted.setup.tableOnly')}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('games.tabletop.scripted.setup.tableOnlyHint')}
      </Typography>
      <Stack direction="row" gap={0.75} flexWrap="wrap" mb={2}>
        {candidates.map((p, i) => (
          <Chip
            key={p.id}
            label={p.name}
            color={i < script.maxPlayers ? 'primary' : 'default'}
            variant={i < script.maxPlayers ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>
      {!players && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('games.tabletop.scripted.setup.players', {
            min: script.minPlayers,
            max: script.maxPlayers,
          })}
        </Alert>
      )}
      {players && candidates.length > players.length && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('games.tabletop.scripted.setup.tooMany', { max: script.maxPlayers })}
        </Alert>
      )}
      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={<PlayArrowIcon />}
        disabled={!players}
        onClick={() => players && onStart(players)}
      >
        {t('games.tabletop.scripted.setup.start')}
      </Button>
    </Box>
  );
};

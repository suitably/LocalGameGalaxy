/**
 * The game chosen on the Spieltisch, started by the host once everybody joined [ID: COMP-PARTY-PENDING-GAME]
 */
import React from 'react';
import { Box, Button, Card, Typography } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { useTranslation } from 'react-i18next';
import { TABLETOP_STARTERS } from '../../../games/tabletop/logic/tableCatalog';
import type { PartyLobbyController } from '../hooks/usePartyLobbyController';

export const PartyPendingGame: React.FC<{ lobby: PartyLobbyController }> = ({ lobby }) => {
  const { t } = useTranslation();
  const { pendingLaunch, amIHost, players, startPendingGame, clearPendingLaunch } = lobby;
  if (!pendingLaunch || !amIHost) return null;
  const starter = TABLETOP_STARTERS.find((g) => g.id === pendingLaunch.gameId);
  const title = starter ? t(starter.titleKey, starter.title) : pendingLaunch.gameId;
  const others = Math.max(0, players.length - 1);

  return (
    <Card
      variant="outlined"
      sx={{ p: 2, mb: 2, borderRadius: 3, borderColor: 'primary.main', bgcolor: 'action.hover' }}
    >
      <Typography variant="overline" color="text.secondary">
        {t('party.pending_game_label', 'Gewähltes Spiel')}
      </Typography>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
        {starter?.icon} {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {others === 0
          ? t(
              'party.pending_game_waiting',
              'Warte auf Mitspieler – sie treten über den QR-Code unten bei.',
            )
          : t('party.pending_game_ready', '{{count}} Mitspieler bereit.', { count: others })}
      </Typography>
      <Box display="flex" gap={1} flexWrap="wrap">
        <Button
          variant="contained"
          size="large"
          startIcon={<PlayArrowRoundedIcon />}
          onClick={startPendingGame}
          sx={{ minHeight: 48, fontWeight: 800 }}
        >
          {t('party.pending_game_start', 'Jetzt starten')}
        </Button>
        <Button onClick={clearPendingLaunch} sx={{ minHeight: 48 }}>
          {t('party.pending_game_other', 'Anderes Spiel')}
        </Button>
      </Box>
    </Card>
  );
};

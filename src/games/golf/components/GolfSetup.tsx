/**
 * Player names and the start button, using the shared player roster [ID: UI-GOLF-SETUP]
 */
import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useTranslation } from 'react-i18next';
import { STORAGE_KEYS } from '../../../lib/storage';
import { PlayerManagerCard, useLobbyPlayers } from '../../../modules/player-management';
import { MAX_PLAYERS, MIN_PLAYERS } from '../logic/engine';

interface GolfSetupProps {
  onStart: (playerNames: string[]) => void;
}

const RULE_KEYS = ['start', 'turn', 'end', 'scoring'] as const;

export const GolfSetup: React.FC<GolfSetupProps> = ({ onStart }) => {
  const { t } = useTranslation();
  const { players, addPlayer, removePlayer, hasMinPlayers } = useLobbyPlayers({
    storageKey: STORAGE_KEYS.GOLF_LOBBY_PLAYERS,
    defaultPlayers: [
      t('games.golf.setup.default_player', { n: 1 }),
      t('games.golf.setup.default_player', { n: 2 }),
    ],
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
  });

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">{t('games.golf.setup.intro')}</Typography>

      <PlayerManagerCard
        players={players}
        onAddPlayer={addPlayer}
        onRemovePlayer={(name, index) => removePlayer(index ?? name)}
        minPlayers={MIN_PLAYERS}
        maxPlayers={MAX_PLAYERS}
        title={t('games.golf.setup.players')}
      />

      <Accordion variant="outlined" disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
          <Typography fontWeight={700}>{t('games.golf.rules.title')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {RULE_KEYS.map((key) => (
              <Typography key={key} variant="body2">
                {t(`games.golf.rules.${key}`)}
              </Typography>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Button
        variant="contained"
        size="large"
        disabled={!hasMinPlayers}
        onClick={() => onStart(players.map((p) => p.name))}
      >
        {t('games.golf.setup.start')}
      </Button>
    </Stack>
  );
};

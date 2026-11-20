/**
 * Player names and the start button, using the shared player roster [ID: UI-SP-SETUP]
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

interface SchwarzerPeterSetupProps {
  onStart: (playerNames: string[]) => void;
}

const RULE_KEYS = ['pairs', 'turn', 'end'] as const;
const K = 'games.schwarzer-peter';

export const SchwarzerPeterSetup: React.FC<SchwarzerPeterSetupProps> = ({ onStart }) => {
  const { t } = useTranslation();
  const { players, addPlayer, removePlayer, hasMinPlayers } = useLobbyPlayers({
    storageKey: STORAGE_KEYS.SCHWARZER_PETER_LOBBY_PLAYERS,
    defaultPlayers: [
      t(`${K}.setup.default_player`, { n: 1 }),
      t(`${K}.setup.default_player`, { n: 2 }),
    ],
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
  });

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">{t(`${K}.setup.intro`)}</Typography>

      <PlayerManagerCard
        players={players}
        onAddPlayer={addPlayer}
        onRemovePlayer={(name, index) => removePlayer(index ?? name)}
        minPlayers={MIN_PLAYERS}
        maxPlayers={MAX_PLAYERS}
        title={t(`${K}.setup.players`)}
      />

      <Accordion variant="outlined" disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
          <Typography fontWeight={700}>{t(`${K}.rules.title`)}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {RULE_KEYS.map((key) => (
              <Typography key={key} variant="body2">
                {t(`${K}.rules.${key}`)}
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
        {t(`${K}.setup.start`)}
      </Button>
    </Stack>
  );
};
